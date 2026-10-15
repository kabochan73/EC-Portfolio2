<?php

namespace App\Actions\Order;

use App\Actions\Address\CreateAddress;
use App\Domain\Order\OrderNumberGenerator;
use App\Domain\Order\ShippingFeeCalculator;
use App\Enums\OrderStatus;
use App\Exceptions\InsufficientStockException;
use App\Exceptions\UnpublishedProductException;
use App\Models\Order;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * 注文作成トランザクション（docs/02-database-design.md の手順）。
 * status = pending で作成し、在庫を引き当てる。決済はこの後の別ステップ。
 */
final class CreateOrder
{
    public function __construct(
        private readonly ShippingFeeCalculator $shippingFee,
        private readonly OrderNumberGenerator $orderNumber,
        private readonly CreateAddress $createAddress,
    ) {}

    public function execute(User $user, CreateOrderInput $input): Order
    {
        return DB::transaction(function () use ($user, $input) {
            // 1. 対象 variant を FOR UPDATE でロック。商品と主画像も読む（画像はスナップショット用）。
            //    ロックは必ず id 昇順で取る（R4 修正 #3）。順番が不定だと、A が [1,2]・B が [2,1] を
            //    同時に注文したとき互いのロックを待ち合ってデッドロックになりうる
            $variants = ProductVariant::query()
                ->with(['product.images' => fn ($q) => $q->where('position', 0)])
                ->whereIn('id', $input->variantIds())
                ->orderBy('id')
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            // 2. 在庫充足を検証
            $shortages = [];
            foreach ($input->items as $line) {
                $variant = $variants->get($line->variantId);
                if ($variant->stock < $line->quantity) {
                    $shortages[] = ['variant_id' => $variant->id, 'available' => $variant->stock];
                }
            }
            if ($shortages !== []) {
                throw new InsufficientStockException($shortages);
            }

            // 3. 未公開商品の混入を検証
            $unpublished = $variants
                ->filter(fn (ProductVariant $v) => ! $v->product->is_published)
                ->pluck('product_id')
                ->unique()
                ->values()
                ->all();
            if ($unpublished !== []) {
                throw new UnpublishedProductException($unpublished);
            }

            // 4. 明細を組み立てつつ subtotal を再計算（クライアント送信の金額は信用しない）
            $subtotal = 0;
            $itemAttributes = [];
            foreach ($input->items as $line) {
                $variant = $variants->get($line->variantId);
                $product = $variant->product;
                $lineTotal = $product->price * $line->quantity;
                $subtotal += $lineTotal;
                $primaryImage = $product->images->first();

                $itemAttributes[] = [
                    'product_id' => $product->id,
                    'product_variant_id' => $variant->id,
                    'product_name' => $product->name,
                    'variant_size' => $variant->size,
                    'variant_color' => $variant->color,
                    'image_url' => $primaryImage ? $primaryImage->url() : '',
                    'unit_price' => $product->price,
                    'quantity' => $line->quantity,
                    'line_total' => $lineTotal,
                ];
            }

            $shipping = $this->shippingFee->for($subtotal);

            // 5-7. 配送先の決定 + 採番 + 作成
            $order = Order::create([
                'user_id' => $user->id,
                'order_number' => $this->orderNumber->generate(),
                'status' => OrderStatus::Pending,
                'subtotal' => $subtotal,
                'shipping_fee' => $shipping,
                'total' => $subtotal + $shipping,
                ...$this->resolveShippingAddress($user, $input),
            ]);
            $order->items()->createMany($itemAttributes);

            // 8. 在庫を減算（SQL 側で stock = stock - X）
            foreach ($input->items as $line) {
                $variants->get($line->variantId)->decrement('stock', $line->quantity);
            }

            // 9. 新規住所かつ「保存」指定なら住所録にも作成。「最初の 1 件なら default」などの
            //    ルールは CreateAddress に任せる（R4。R3 はここに同じ処理を重複して書いていた）。
            //    CreateAddress 内の DB::transaction は、この外側のトランザクションに合流する
            if ($input->newAddress !== null && $input->saveAddress) {
                $this->createAddress->execute($user, $input->newAddress->toAddressAttributes());
            }

            return $order->load('items');
        });
    }

    /**
     * @return array<string, mixed> orders の ship_* 列
     */
    private function resolveShippingAddress(User $user, CreateOrderInput $input): array
    {
        if ($input->addressId !== null) {
            // 本人の住所であることは StoreOrderRequest の Rule::exists(...)->where(...) で検証済み
            $address = $user->addresses()->findOrFail($input->addressId);

            return $address->toShipmentSnapshot();
        }

        return $input->newAddress->toOrderShipAttributes();
    }
}
