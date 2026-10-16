<?php

namespace App\Actions\Payment;

use App\Actions\Admin\Order\TransitionOrderStatus;
use App\Enums\OrderStatus;
use App\Models\Order;
use Illuminate\Support\Facades\DB;
use Stripe\Event;
use Stripe\PaymentIntent;

/**
 * Webhook `payment_intent.canceled`（Stripe 側の自動期限切れ・キャンセル）。
 * 注文が pending のときだけ cancelled にして在庫を戻す（冪等）。
 *
 * キャンセル処理そのものは TransitionOrderStatus に任せる（R4。R3 は「在庫を戻して cancelled に
 * する」をここにも重複して書いていた）。先に payments.status を canceled にしておくので、
 * TransitionOrderStatus は Stripe に問い合わせずに進む
 */
final class CancelOrderPayment
{
    public function __construct(private readonly TransitionOrderStatus $transition) {}

    public function execute(Event $event): void
    {
        /** @var PaymentIntent $intent */
        $intent = $event->data->object;
        $orderId = (int) ($intent->metadata->order_id ?? 0);

        DB::transaction(function () use ($intent, $orderId) {
            $order = Order::whereKey($orderId)->lockForUpdate()->first();

            // 既に paid / cancelled なら何もしない。payments も書き換えない
            // （遅れて届いた canceled で、支払い済みの記録を壊さないため）
            if ($order === null || $order->status !== OrderStatus::Pending) {
                return;
            }

            $order->payment?->update(['status' => $intent->status]);

            // 同じトランザクション内なので、cancelIfPending の再ロックはすぐ取れる
            $this->transition->cancelIfPending($order);
        });
    }
}
