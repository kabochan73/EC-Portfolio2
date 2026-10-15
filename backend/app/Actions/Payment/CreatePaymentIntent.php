<?php

namespace App\Actions\Payment;

use App\Domain\Order\ShippingFeeCalculator;
use App\Enums\OrderStatus;
use App\Exceptions\OrderNotPendingException;
use App\Exceptions\PaymentAmountMismatchException;
use App\Models\Order;
use App\Services\StripeService;
use Illuminate\Support\Facades\DB;
use Stripe\PaymentIntent;
use Symfony\Component\HttpKernel\Exception\ServiceUnavailableHttpException;

/**
 * 注文に対する PaymentIntent の作成 or 再利用（docs/09-payments-stripe.md）。
 * 何度呼んでも同じ PaymentIntent を返す（冪等）。
 *
 * 同時に 2 回呼ばれても PaymentIntent を 1 つにする（R4 追加）:
 * 注文の行を lockForUpdate してから「payments があるか」を見る。後から来たリクエストは
 * 先のリクエストが終わるまで待ち、待ち終わった時点では payments ができているので再利用する。
 * （R3 はロックが無く、ダブルクリック等で Stripe に PaymentIntent が 2 つでき、
 *   2 つ目の payments 保存が UNIQUE 違反で 500 になりえた）
 */
final class CreatePaymentIntent
{
    public function __construct(
        private readonly StripeService $stripe,
        private readonly ShippingFeeCalculator $shippingFee,
    ) {}

    /**
     * @return array{client_secret: string, publishable_key: string}
     */
    public function execute(Order $order): array
    {
        if (blank(config('services.stripe.secret'))) {
            throw new ServiceUnavailableHttpException(null, '決済は現在利用できません。');
        }

        $intent = DB::transaction(function () use ($order) {
            // ロック後の最新の状態で判定する（この間に Webhook で paid になっているかもしれない）
            $order = Order::whereKey($order->id)->lockForUpdate()->firstOrFail();

            if ($order->status !== OrderStatus::Pending) {
                throw new OrderNotPendingException($order->status);
            }

            $this->assertAmountUnchanged($order);

            $intent = $order->payment === null
                ? $this->createFor($order)
                : $this->stripe->retrievePaymentIntent($order->payment->stripe_payment_intent_id);

            // 稀に PaymentIntent が canceled になっていたら作り直す
            if ($intent->status === 'canceled') {
                $order->payment->delete();
                $order->unsetRelation('payment');
                $intent = $this->createFor($order);
            }

            return $intent;
        });

        return [
            'client_secret' => $intent->client_secret,
            'publishable_key' => (string) config('services.stripe.publishable'),
        ];
    }

    private function createFor(Order $order): PaymentIntent
    {
        $intent = $this->stripe->createPaymentIntent($order);

        $order->payment()->create([
            'provider' => 'stripe',
            'stripe_payment_intent_id' => $intent->id,
            'status' => $intent->status,
            'amount' => $order->total,
            'currency' => config('shop.currency'),
        ]);

        return $intent;
    }

    /**
     * 注文作成時の total と、現在のカタログ価格で再計算した total が一致するか。
     * ズレていれば注文を作り直させる（409）。
     */
    private function assertAmountUnchanged(Order $order): void
    {
        $order->loadMissing('items.variant.product');

        $subtotal = 0;
        foreach ($order->items as $item) {
            $currentPrice = $item->variant?->product?->price;
            if ($currentPrice === null) {
                // 注文後に商品 / バリアントが削除された
                throw new PaymentAmountMismatchException($order->total, -1);
            }
            $subtotal += $currentPrice * $item->quantity;
        }

        $recalculated = $subtotal + $this->shippingFee->for($subtotal);

        if ($recalculated !== $order->total) {
            throw new PaymentAmountMismatchException($order->total, $recalculated);
        }
    }
}
