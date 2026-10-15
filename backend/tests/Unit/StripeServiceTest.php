<?php

use App\Services\StripeService;
use Stripe\Refund;
use Stripe\Service\RefundService;
use Stripe\StripeClient;

// StripeService は Stripe SDK の薄いラッパー。通信はせず、SDK に渡す引数だけを確かめる

it('sends an idempotency key derived from the payment intent when refunding', function () {
    // 同じキーのリクエストは Stripe 側で 2 回目以降実行されない = 二重返金の防止（R4 追加）
    $refunds = Mockery::mock(RefundService::class);
    $refunds->shouldReceive('create')
        ->once()
        ->with(['payment_intent' => 'pi_123'], ['idempotency_key' => 'refund-pi_123'])
        ->andReturn(Refund::constructFrom(['id' => 're_1']));

    $client = Mockery::mock(StripeClient::class);
    $client->refunds = $refunds;

    $refund = (new StripeService($client))->refund('pi_123');

    expect($refund->id)->toBe('re_1');
});
