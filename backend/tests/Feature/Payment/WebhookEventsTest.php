<?php

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use App\Services\StripeService;
use Illuminate\Testing\TestResponse;
use Stripe\Event;
use Tests\Support\StripeFixtures;

function orderWithStockedVariant(int $stock, int $qty): array
{
    $user = User::factory()->create();
    $product = Product::factory()->create();
    $variant = ProductVariant::factory()->for($product)->create(['size' => 'M', 'stock' => $stock]);

    $order = Order::factory()->for($user)->create(['status' => OrderStatus::Pending, 'total' => 6_800]);
    $order->items()->create([
        'product_id' => $product->id,
        'product_variant_id' => $variant->id,
        'product_name' => $product->name,
        'variant_size' => 'M',
        'unit_price' => 6_000,
        'quantity' => $qty,
        'line_total' => 6_000 * $qty,
    ]);
    Payment::factory()->for($order)->create(['stripe_payment_intent_id' => 'pi_test_1']);

    return [$order, $variant];
}

function deliver(Event $event): TestResponse
{
    test()->mock(StripeService::class)
        ->shouldReceive('constructWebhookEvent')->andReturn($event);

    return test()->postJson('/api/stripe/webhook', ['_' => 1], ['Stripe-Signature' => 'x']);
}

it('records the failure reason on payment_intent.payment_failed', function () {
    [$order] = orderWithStockedVariant(stock: 8, qty: 1);

    deliver(StripeFixtures::event('payment_intent.payment_failed', [
        'status' => 'requires_payment_method',
        'last_payment_error' => ['message' => 'カードが拒否されました。'],
        'metadata' => ['order_id' => (string) $order->id],
    ], id: 'evt_fail'))->assertOk();

    $order->refresh();
    expect($order->status)->toBe(OrderStatus::Pending)
        ->and($order->payment->last_error)->toBe('カードが拒否されました。');
});

it('cancels a pending order and restocks on payment_intent.canceled', function () {
    [$order, $variant] = orderWithStockedVariant(stock: 8, qty: 2);

    deliver(StripeFixtures::event('payment_intent.canceled', [
        'status' => 'canceled',
        'metadata' => ['order_id' => (string) $order->id],
    ], id: 'evt_cancel'))->assertOk();

    expect($order->fresh()->status)->toBe(OrderStatus::Cancelled)
        ->and($order->fresh()->cancelled_at)->not->toBeNull()
        ->and($variant->fresh()->stock)->toBe(10); // 8 + 2 戻る
});

it('ignores payment_intent.canceled for an order that is already paid', function () {
    [$order, $variant] = orderWithStockedVariant(stock: 8, qty: 2);
    $order->update(['status' => OrderStatus::Paid, 'paid_at' => now()]);
    $order->payment->update(['status' => 'succeeded']);

    deliver(StripeFixtures::event('payment_intent.canceled', [
        'status' => 'canceled',
        'metadata' => ['order_id' => (string) $order->id],
    ], id: 'evt_cancel_late'))->assertOk();

    expect($order->fresh()->status)->toBe(OrderStatus::Paid)
        ->and($variant->fresh()->stock)->toBe(8) // 戻さない
        // 支払い済みの記録も書き換えない（R4 で追加した確認）
        ->and($order->payment->fresh()->status)->toBe('succeeded');
});

it('marks the payment refunded on charge.refunded, once', function () {
    [$order] = orderWithStockedVariant(stock: 8, qty: 1);
    $order->payment->update(['status' => 'succeeded']);

    $event = StripeFixtures::event('charge.refunded', [
        'payment_intent' => 'pi_test_1',
    ], id: 'evt_refund');

    deliver($event)->assertOk();
    $firstRefundedAt = $order->fresh()->payment->refunded_at;
    expect($firstRefundedAt)->not->toBeNull();

    // 二重配信でも refunded_at は最初のまま
    test()->travel(1)->hours();
    deliver($event)->assertOk();
    expect($order->fresh()->payment->refunded_at->equalTo($firstRefundedAt))->toBeTrue();
});
