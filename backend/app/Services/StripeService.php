<?php

namespace App\Services;

use App\Models\Order;
use Stripe\Event;
use Stripe\Exception\SignatureVerificationException;
use Stripe\PaymentIntent;
use Stripe\Refund;
use Stripe\StripeClient;
use Stripe\Webhook;

/**
 * Stripe API の薄いラッパー（docs/06-laravel-design.md §2-3 / docs/09-payments-stripe.md）。
 * SDK をコントローラや Action に散らさず、この1クラスに閉じる。テストではモックする。
 */
class StripeService
{
    public function __construct(private readonly StripeClient $stripe) {}

    /**
     * 注文に対する PaymentIntent を作成する。
     * JPY はゼロ小数通貨なので amount は円そのまま（orders.total）。
     */
    public function createPaymentIntent(Order $order): PaymentIntent
    {
        return $this->stripe->paymentIntents->create([
            'amount' => $order->total,
            'currency' => config('shop.currency'),
            'automatic_payment_methods' => ['enabled' => true],
            'metadata' => [
                'order_id' => (string) $order->id,
                'order_number' => $order->order_number,
            ],
        ]);
    }

    public function retrievePaymentIntent(string $id): PaymentIntent
    {
        return $this->stripe->paymentIntents->retrieve($id);
    }

    /** 未決済の PaymentIntent を取り消す（pending 注文のキャンセル時。docs/09）。 */
    public function cancelPaymentIntent(string $id): PaymentIntent
    {
        return $this->stripe->paymentIntents->cancel($id);
    }

    /**
     * 全額返金（部分返金はスコープ外。docs/09）。
     *
     * idempotency key を付ける（R4。rebuild-log の残タスク ④）。同じキーのリクエストは Stripe 側で
     * 2 回目以降は実行されず 1 回目の結果が返る。全額返金は PaymentIntent 1 つにつき 1 回しか
     * ありえないので PI の ID をキーにする。DB がロールバックして処理がやり直しになっても二重返金しない
     */
    public function refund(string $paymentIntentId): Refund
    {
        return $this->stripe->refunds->create(
            ['payment_intent' => $paymentIntentId],
            ['idempotency_key' => "refund-{$paymentIntentId}"],
        );
    }

    /**
     * Webhook の署名を検証して Event を組み立てる。
     * 生のリクエストボディが必要（パース済みの配列ではダメ。docs/09）。
     *
     * @throws SignatureVerificationException
     */
    public function constructWebhookEvent(string $payload, ?string $signature): Event
    {
        return Webhook::constructEvent(
            $payload,
            $signature ?? '',
            (string) config('services.stripe.webhook_secret'),
        );
    }
}
