<?php

use App\Enums\OrderStatus;
use App\Jobs\SendOrderShippedJob;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use App\Services\StripeService;
use Illuminate\Support\Facades\Queue;
use Illuminate\Testing\TestResponse;
use Stripe\PaymentIntent;
use Stripe\Refund;

function orderWithStock(OrderStatus $status, int $stock = 8, int $qty = 2): array
{
    $product = Product::factory()->create();
    $variant = ProductVariant::factory()->for($product)->create(['size' => 'M', 'stock' => $stock]);
    $order = Order::factory()->create(['status' => $status]);
    $order->items()->create([
        'product_id' => $product->id,
        'product_variant_id' => $variant->id,
        'product_name' => $product->name,
        'variant_size' => 'M',
        'unit_price' => 6_000,
        'quantity' => $qty,
        'line_total' => 6_000 * $qty,
    ]);

    return [$order, $variant];
}

function putStatus(Order $order, string $status): TestResponse
{
    return test()->actingAs(admin())
        ->putJson("/api/admin/orders/{$order->order_number}/status", ['status' => $status]);
}

it('marks a paid order as shipped and queues the shipped mail', function () {
    Queue::fake();
    [$order] = orderWithStock(OrderStatus::Paid);

    putStatus($order, 'shipped')
        ->assertOk()
        ->assertJsonPath('data.status', 'shipped');

    expect($order->fresh()->shipped_at)->not->toBeNull();
    Queue::assertPushed(SendOrderShippedJob::class);
});

it('completes a shipped order', function () {
    [$order] = orderWithStock(OrderStatus::Shipped);

    putStatus($order, 'completed')
        ->assertOk()
        ->assertJsonPath('data.status', 'completed');
});

it('cancels a pending order and restocks', function () {
    [$order, $variant] = orderWithStock(OrderStatus::Pending, stock: 8, qty: 2);

    putStatus($order, 'cancelled')->assertOk();

    expect($order->fresh()->status)->toBe(OrderStatus::Cancelled)
        ->and($order->fresh()->cancelled_at)->not->toBeNull()
        ->and($variant->fresh()->stock)->toBe(10);
});

it('cancels a paid order: refunds via Stripe and restocks', function () {
    [$order, $variant] = orderWithStock(OrderStatus::Paid, stock: 8, qty: 2);
    Payment::factory()->for($order)->succeeded()->create(['stripe_payment_intent_id' => 'pi_ref_1']);

    $this->mock(StripeService::class)
        ->shouldReceive('refund')->once()->with('pi_ref_1')
        ->andReturn(Refund::constructFrom(['id' => 're_1']));

    putStatus($order, 'cancelled')->assertOk();

    expect($order->fresh()->status)->toBe(OrderStatus::Cancelled)
        ->and($order->fresh()->payment->refunded_at)->not->toBeNull()
        ->and($variant->fresh()->stock)->toBe(10);
});

it('cancels a shipped order without restocking (return handled manually)', function () {
    [$order, $variant] = orderWithStock(OrderStatus::Shipped, stock: 8, qty: 2);
    Payment::factory()->for($order)->succeeded()->create(['stripe_payment_intent_id' => 'pi_ship_ref']);

    $this->mock(StripeService::class)->shouldReceive('refund')->never();

    putStatus($order, 'cancelled')->assertOk();

    expect($order->fresh()->status)->toBe(OrderStatus::Cancelled)
        ->and($variant->fresh()->stock)->toBe(8); // 戻さない
});

it('rejects an invalid transition (422)', function () {
    [$order] = orderWithStock(OrderStatus::Pending);

    putStatus($order, 'shipped')
        ->assertStatus(422)
        ->assertJsonValidationErrorFor('status');

    [$completed] = orderWithStock(OrderStatus::Completed);
    putStatus($completed, 'cancelled')->assertStatus(422);
});

it('rejects setting status to pending or paid via the admin endpoint', function () {
    [$order] = orderWithStock(OrderStatus::Paid);

    putStatus($order, 'paid')->assertStatus(422);
    putStatus($order, 'pending')->assertStatus(422);
});

it('returns 404 for an unknown order number', function () {
    $this->actingAs(admin())
        ->putJson('/api/admin/orders/EC-20000101-0001/status', ['status' => 'shipped'])
        ->assertNotFound();
});

it('rejects a non-admin', function () {
    [$order] = orderWithStock(OrderStatus::Paid);

    $this->actingAs(User::factory()->create())
        ->putJson("/api/admin/orders/{$order->order_number}/status", ['status' => 'shipped'])
        ->assertForbidden();
});

it('cancels the Stripe PaymentIntent when cancelling a pending order', function () {
    [$order, $variant] = orderWithStock(OrderStatus::Pending, stock: 8, qty: 2);
    Payment::factory()->for($order)->create(['stripe_payment_intent_id' => 'pi_pend_1']);

    $stripe = $this->mock(StripeService::class);
    $stripe->shouldReceive('retrievePaymentIntent')->once()->with('pi_pend_1')
        ->andReturn(PaymentIntent::constructFrom(['id' => 'pi_pend_1', 'status' => 'requires_payment_method']));
    $stripe->shouldReceive('cancelPaymentIntent')->once()->with('pi_pend_1')
        ->andReturn(PaymentIntent::constructFrom(['id' => 'pi_pend_1', 'status' => 'canceled']));

    putStatus($order, 'cancelled')->assertOk();

    expect($order->fresh()->status)->toBe(OrderStatus::Cancelled)
        ->and($order->fresh()->payment->status)->toBe('canceled')
        ->and($variant->fresh()->stock)->toBe(10);
});

it('refuses to cancel a pending order whose payment already succeeded (409)', function () {
    [$order, $variant] = orderWithStock(OrderStatus::Pending, stock: 8, qty: 2);
    Payment::factory()->for($order)->create(['stripe_payment_intent_id' => 'pi_done_1']);

    $stripe = $this->mock(StripeService::class);
    $stripe->shouldReceive('retrievePaymentIntent')
        ->andReturn(PaymentIntent::constructFrom(['id' => 'pi_done_1', 'status' => 'succeeded']));
    $stripe->shouldReceive('cancelPaymentIntent')->never();

    putStatus($order, 'cancelled')->assertStatus(409);

    expect($order->fresh()->status)->toBe(OrderStatus::Pending)
        ->and($variant->fresh()->stock)->toBe(8);
});
