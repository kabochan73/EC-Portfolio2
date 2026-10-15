<?php

namespace App\Actions\Payment;

use App\Enums\OrderStatus;
use App\Jobs\SendOrderConfirmationJob;
use App\Models\Order;
use App\Services\StripeService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Stripe\Event;
use Stripe\PaymentIntent;

/**
 * Webhook `payment_intent.succeeded` の本体（docs/09-payments-stripe.md）。
 * 冪等: 注文が pending でなければ何もしない。
 * 例外: 注文がキャンセル済みなら、入金を自動返金する（安全網）。
 */
final class MarkOrderPaid
{
    public function __construct(private readonly StripeService $stripe) {}

    public function execute(Event $event): void
    {
        /** @var PaymentIntent $intent */
        $intent = $event->data->object;
        $orderId = (int) ($intent->metadata->order_id ?? 0);

        DB::transaction(function () use ($intent, $orderId) {
            $order = Order::whereKey($orderId)->lockForUpdate()->first();
            if ($order === null) {
                return;
            }

            if ($order->status === OrderStatus::Cancelled) {
                $this->refundLatePayment($order, $intent);

                return;
            }

            if ($order->status !== OrderStatus::Pending) {
                return;
            }

            $order->payment?->update([
                'status' => 'succeeded',
                'stripe_charge_id' => $intent->latest_charge,
                'last_error' => null,
            ]);
            $order->update([
                'status' => OrderStatus::Paid,
                'paid_at' => now(),
            ]);

            // コミット後に積む（R4）。今の database キューなら同じトランザクションに入るので
            // 問題は出ないが、Redis 等に替えると paid になる前に送信が始まりうる
            SendOrderConfirmationJob::dispatch($order->id)->afterCommit();
        });
    }

    /**
     * キャンセル済みの注文に入金があった（キャンセル時の PaymentIntent 取り消しをすり抜けた）。
     * 商品は確保していないので、全額返金して記録する。
     */
    private function refundLatePayment(Order $order, PaymentIntent $intent): void
    {
        if ($order->payment?->refunded_at !== null) {
            return;
        }

        $this->stripe->refund($intent->id);
        $order->payment?->update([
            'status' => 'succeeded',
            'stripe_charge_id' => $intent->latest_charge,
            'refunded_at' => now(),
        ]);

        Log::warning('Refunded a payment for a cancelled order.', [
            'order_number' => $order->order_number,
            'payment_intent' => $intent->id,
        ]);
    }
}
