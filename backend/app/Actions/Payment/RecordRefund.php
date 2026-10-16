<?php

namespace App\Actions\Payment;

use App\Models\Payment;
use Stripe\Charge;
use Stripe\Event;

/**
 * Webhook `charge.refunded`（docs/09-payments-stripe.md）。
 * admin キャンセル経由の返金の追認。refunded_at が null のときだけ記録（冪等）。
 * 返金そのものは TransitionOrderStatus 側で同期実行済み（Step 24）。
 */
final class RecordRefund
{
    public function execute(Event $event): void
    {
        /** @var Charge $charge */
        $charge = $event->data->object;

        Payment::where('stripe_payment_intent_id', $charge->payment_intent)
            ->whereNull('refunded_at')
            ->update(['refunded_at' => now()]);
    }
}
