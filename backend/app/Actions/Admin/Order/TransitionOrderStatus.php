<?php

namespace App\Actions\Admin\Order;

use App\Actions\Order\RestockOrder;
use App\Enums\OrderStatus;
use App\Exceptions\InvalidOrderTransitionException;
use App\Exceptions\PaymentInProgressException;
use App\Jobs\SendOrderShippedJob;
use App\Models\Order;
use App\Services\StripeService;
use Illuminate\Support\Facades\DB;
use Stripe\Exception\InvalidRequestException;

/**
 * 注文ステータス遷移の唯一の入口（docs/02-database-design.md の state machine）。
 * 「遷移が許されるか」は OrderStatus::canTransitionTo。副作用はここ。
 *
 *  - pending→cancelled: Stripe の PaymentIntent を取り消してから在庫を戻す
 *    （取り消さないと、キャンセル後にユーザーが支払いを完了できてしまう）
 *  - paid→cancelled: Stripe 返金 + 在庫を戻す
 *  - shipped→cancelled: 返品扱い。在庫は戻さない（手動対応前提）
 *  - paid→shipped: shipped_at + 発送通知メール
 *  - shipped→completed: 副作用なし
 */
final class TransitionOrderStatus
{
    public function __construct(
        private readonly RestockOrder $restockOrder,
        private readonly StripeService $stripe,
    ) {}

    public function execute(Order $order, OrderStatus $to): Order
    {
        return DB::transaction(function () use ($order, $to) {
            $order = $this->lock($order);
            $this->apply($order, $to);

            return $order->fresh();
        });
    }

    /**
     * ロック後もまだ pending のときだけキャンセルする（期限切れ・注文の置き換え用）。
     * 直前に Webhook で paid になっていた場合は何もせず false（paid→cancelled の返金に化けさせない）。
     *
     * @throws PaymentInProgressException 決済が確定済み / 処理中
     */
    public function cancelIfPending(Order $order): bool
    {
        return DB::transaction(function () use ($order) {
            $order = $this->lock($order);
            if ($order->status !== OrderStatus::Pending) {
                return false;
            }
            $this->apply($order, OrderStatus::Cancelled);

            return true;
        });
    }

    private function lock(Order $order): Order
    {
        return Order::whereKey($order->id)->lockForUpdate()->firstOrFail();
    }

    private function apply(Order $order, OrderStatus $to): void
    {
        $from = $order->status;
        if (! $from->canTransitionTo($to)) {
            throw new InvalidOrderTransitionException($from, $to);
        }

        match ($to) {
            OrderStatus::Cancelled => $this->cancel($order, $from),
            OrderStatus::Shipped => $this->ship($order),
            default => null,
        };

        $order->update([
            'status' => $to,
            ...$this->timestampFor($to),
        ]);
    }

    private function cancel(Order $order, OrderStatus $from): void
    {
        if ($from === OrderStatus::Pending) {
            $this->cancelPaymentIntent($order);
        }

        if ($from === OrderStatus::Paid) {
            $order->loadMissing('payment');
            if ($order->payment !== null && $order->payment->refunded_at === null) {
                $this->stripe->refund($order->payment->stripe_payment_intent_id);
                $order->payment->update(['refunded_at' => now()]);
            }
        }

        // 発送済みからのキャンセル（返品）は在庫を戻さない
        if (in_array($from, [OrderStatus::Pending, OrderStatus::Paid], true)) {
            $this->restockOrder->execute($order);
        }
    }

    /**
     * pending 注文の PaymentIntent を Stripe 側で取り消す。PaymentIntent が無ければ何もしない。
     * 決済が確定済み / 処理中なら取り消せないのでキャンセル自体を止める（Webhook で paid になる）。
     */
    private function cancelPaymentIntent(Order $order): void
    {
        $order->loadMissing('payment');
        if ($order->payment === null) {
            return;
        }

        // Webhook payment_intent.canceled 経由など、取り消し済みと分かっていれば Stripe に問い合わせない（R4）
        if ($order->payment->status === 'canceled') {
            return;
        }

        $intent = $this->stripe->retrievePaymentIntent($order->payment->stripe_payment_intent_id);
        if ($intent->status === 'canceled') {
            return;
        }
        if (in_array($intent->status, ['succeeded', 'processing'], true)) {
            throw new PaymentInProgressException;
        }

        try {
            $intent = $this->stripe->cancelPaymentIntent($intent->id);
        } catch (InvalidRequestException) {
            // 取得〜取り消しの間にユーザーが支払いを確定させた
            throw new PaymentInProgressException;
        }

        $order->payment->update(['status' => $intent->status]);
    }

    private function ship(Order $order): void
    {
        // コミット後に積む（MarkOrderPaid と同じ理由）
        SendOrderShippedJob::dispatch($order->id)->afterCommit();
    }

    /**
     * @return array<string, mixed>
     */
    private function timestampFor(OrderStatus $to): array
    {
        return match ($to) {
            OrderStatus::Shipped => ['shipped_at' => now()],
            OrderStatus::Cancelled => ['cancelled_at' => now()],
            default => [],
        };
    }
}
