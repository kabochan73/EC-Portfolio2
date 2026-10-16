<?php

namespace App\Http\Controllers\Api\Webhook;

use App\Actions\Payment\CancelOrderPayment;
use App\Actions\Payment\HandlePaymentFailed;
use App\Actions\Payment\MarkOrderPaid;
use App\Actions\Payment\RecordRefund;
use App\Http\Controllers\Controller;
use App\Models\StripeEvent;
use App\Services\StripeService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Stripe\Exception\SignatureVerificationException;
use Throwable;

/**
 * Stripe Webhook（docs/09-payments-stripe.md）。
 *
 * 認証なし・署名検証のみ。Stripe から直接叩かれるので BFF を挟めない
 * （backend の唯一の公開エンドポイント）。
 */
class StripeController extends Controller
{
    public function __invoke(Request $request, StripeService $stripe): Response
    {
        try {
            $event = $stripe->constructWebhookEvent(
                $request->getContent(),
                $request->header('Stripe-Signature'),
            );
        } catch (SignatureVerificationException) {
            return response('invalid signature', 400);
        }

        // 冪等: 未処理として記録。既に processed_at があれば false（スキップ）
        if (! StripeEvent::claim($event->id, $event->type)) {
            return response('already processed', 200);
        }

        try {
            match ($event->type) {
                'payment_intent.succeeded' => app(MarkOrderPaid::class)->execute($event),
                'payment_intent.payment_failed' => app(HandlePaymentFailed::class)->execute($event),
                'payment_intent.canceled' => app(CancelOrderPayment::class)->execute($event),
                'charge.refunded' => app(RecordRefund::class)->execute($event),
                default => null, // 未対応イベントは受け流す
            };
        } catch (Throwable $e) {
            report($e);

            // processed_at は未セットのまま。Stripe が再送し、次回 claim は true になる
            return response('processing error', 500);
        }

        StripeEvent::complete($event->id);

        return response('ok', 200);
    }
}
