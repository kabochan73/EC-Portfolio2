<?php

use App\Enums\OrderStatus;
use App\Jobs\SendOrderConfirmationJob;
use App\Models\Order;
use App\Models\Payment;
use App\Models\StripeEvent;
use App\Models\User;
use App\Services\StripeService;
use Illuminate\Support\Facades\Queue;
use Illuminate\Testing\TestResponse;
use Stripe\Event;
use Stripe\Exception\SignatureVerificationException;
use Stripe\Refund;
use Tests\Support\StripeFixtures;

function pendingOrderWithIntent(string $intentId = 'pi_test_1'): Order
{
    $user = User::factory()->create();
    $order = Order::factory()->for($user)->withItems(1)->create([
        'status' => OrderStatus::Pending,
        'total' => 6_800,
    ]);
    Payment::factory()->for($order)->create([
        'stripe_payment_intent_id' => $intentId,
        'status' => 'requires_payment_method',
    ]);

    return $order;
}

function postWebhook(Event $event): TestResponse
{
    test()->mock(StripeService::class)
        ->shouldReceive('constructWebhookEvent')
        ->andReturn($event);

    return test()->postJson('/api/stripe/webhook', ['_' => 1], ['Stripe-Signature' => 't=1,v1=x']);
}

it('rejects a webhook with an invalid signature', function () {
    $this->mock(StripeService::class)
        ->shouldReceive('constructWebhookEvent')
        ->andThrow(new SignatureVerificationException('bad'));

    $this->postJson('/api/stripe/webhook', ['_' => 1], ['Stripe-Signature' => 'nope'])
        ->assertStatus(400);
});

it('marks the order paid and queues the confirmation mail on payment_intent.succeeded', function () {
    Queue::fake();
    $order = pendingOrderWithIntent();

    postWebhook(StripeFixtures::event('payment_intent.succeeded', [
        'metadata' => ['order_id' => (string) $order->id],
        'latest_charge' => 'ch_abc',
    ]))->assertOk();

    $order->refresh();
    expect($order->status)->toBe(OrderStatus::Paid)
        ->and($order->paid_at)->not->toBeNull()
        ->and($order->payment->status)->toBe('succeeded')
        ->and($order->payment->stripe_charge_id)->toBe('ch_abc');

    Queue::assertPushed(SendOrderConfirmationJob::class);
});

it('is idempotent for a duplicated event delivery', function () {
    Queue::fake();
    $order = pendingOrderWithIntent();
    $event = StripeFixtures::event('payment_intent.succeeded', [
        'metadata' => ['order_id' => (string) $order->id],
    ], id: 'evt_dup');

    postWebhook($event)->assertOk();
    postWebhook($event)->assertOk(); // same event id

    Queue::assertPushed(SendOrderConfirmationJob::class, 1);
    expect(StripeEvent::where('stripe_event_id', 'evt_dup')->count())->toBe(1);
});

it('does nothing when the order is already paid', function () {
    Queue::fake();
    $order = pendingOrderWithIntent();
    $order->update(['status' => OrderStatus::Paid, 'paid_at' => now()->subHour()]);

    postWebhook(StripeFixtures::event('payment_intent.succeeded', [
        'metadata' => ['order_id' => (string) $order->id],
    ], id: 'evt_late'))->assertOk();

    Queue::assertNotPushed(SendOrderConfirmationJob::class);
});

it('acknowledges an unhandled event type with 200', function () {
    postWebhook(StripeFixtures::event('customer.created', id: 'evt_other'))
        ->assertOk();

    expect(StripeEvent::where('stripe_event_id', 'evt_other')->first()->processed_at)->not->toBeNull();
});

it('retries a previously failed event (processed_at still null)', function () {
    Queue::fake();
    $order = pendingOrderWithIntent();

    // 前回受信して未処理のまま残っている行
    StripeEvent::create(['stripe_event_id' => 'evt_retry', 'type' => 'payment_intent.succeeded', 'created_at' => now()]);

    postWebhook(StripeFixtures::event('payment_intent.succeeded', [
        'metadata' => ['order_id' => (string) $order->id],
    ], id: 'evt_retry'))->assertOk();

    expect($order->fresh()->status)->toBe(OrderStatus::Paid);
    Queue::assertPushed(SendOrderConfirmationJob::class);
});

it('refunds a payment that arrives for a cancelled order', function () {
    Queue::fake();
    $order = pendingOrderWithIntent('pi_late_1');
    $order->update(['status' => OrderStatus::Cancelled, 'cancelled_at' => now()]);

    $stripe = $this->mock(StripeService::class);
    $stripe->shouldReceive('constructWebhookEvent')->andReturn(StripeFixtures::event('payment_intent.succeeded', [
        'id' => 'pi_late_1',
        'metadata' => ['order_id' => (string) $order->id],
    ], id: 'evt_late'));
    $stripe->shouldReceive('refund')->once()->with('pi_late_1')
        ->andReturn(Refund::constructFrom(['id' => 're_late']));

    $this->postJson('/api/stripe/webhook', ['_' => 1], ['Stripe-Signature' => 't=1,v1=x'])->assertOk();

    $order->refresh();
    expect($order->status)->toBe(OrderStatus::Cancelled)
        ->and($order->payment->refunded_at)->not->toBeNull();
    Queue::assertNotPushed(SendOrderConfirmationJob::class);
});
