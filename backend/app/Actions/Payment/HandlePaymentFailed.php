<?php

namespace App\Actions\Payment;

use App\Models\Payment;
use Stripe\Event;
use Stripe\PaymentIntent;

/**
 * Webhook `payment_intent.payment_failed`（docs/09-payments-stripe.md）。
 * 直近の失敗理由を記録するだけ。注文は pending のまま（ユーザーが再試行できる）。
 * 何度実行しても同じ（冪等）。
 */
final class HandlePaymentFailed
{
    public function execute(Event $event): void
    {
        /** @var PaymentIntent $intent */
        $intent = $event->data->object;

        $message = $intent->last_payment_error->message ?? '決済に失敗しました。';

        Payment::where('stripe_payment_intent_id', $intent->id)
            ->update(['status' => $intent->status, 'last_error' => mb_substr($message, 0, 255)]);
    }
}
