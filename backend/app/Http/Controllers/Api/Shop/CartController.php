<?php

namespace App\Http\Controllers\Api\Shop;

use App\Enums\StockStatus;
use App\Http\Controllers\Controller;
use App\Models\ProductVariant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CartController extends Controller
{
    /**
     * カート明細の再検証（docs/03-api.md GET /api/cart/validate）。
     * /cart・/checkout 表示時に、各 variant の現在価格・在庫・公開状態を返す。
     * 存在しない / 非公開商品の variant は available=false。
     */
    public function validate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'variant_ids' => ['required', 'array', 'min:1', 'max:100'],
            'variant_ids.*' => ['integer'],
        ]);

        /** @var list<int> $ids */
        $ids = array_values(array_unique(array_map('intval', $validated['variant_ids'])));

        $variants = ProductVariant::query()
            ->with(['product' => fn ($q) => $q->with(['images' => fn ($i) => $i->where('position', 0)])])
            ->whereIn('id', $ids)
            ->get()
            ->keyBy('id');

        $maxPerLine = (int) config('shop.cart_max_quantity_per_line');

        $data = array_map(function (int $id) use ($variants, $maxPerLine) {
            $variant = $variants->get($id);

            if ($variant === null || $variant->product === null || ! $variant->product->is_published) {
                return ['variant_id' => $id, 'available' => false];
            }

            $product = $variant->product;
            $image = $product->images->first();
            $status = StockStatus::fromStock($variant->stock);

            return [
                'variant_id' => $id,
                'available' => true,
                'price' => $product->price,
                'stock_status' => $status->value,
                'max_quantity' => min($variant->stock, $maxPerLine),
                'product_name' => $product->name,
                'product_slug' => $product->slug,
                'size' => $variant->size,
                'color' => $variant->color,
                'image_url' => $image ? $image->url() : null,
            ];
        }, $ids);

        return response()->json(['data' => $data]);
    }
}
