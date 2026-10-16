<?php

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use App\Services\StripeService;
use Stripe\PaymentIntent;

/**
 * 在庫 $stock の variant を $qty 個確保した注文を作る（在庫は確保後の値で作る）。
 *
 * @return array{0: Order, 1: ProductVariant}
 */
function reservedOrder(OrderStatus $status, ?User $user = null, int $stock = 8, int $qty = 2): array
{
    $product = Product::factory()->create(['price' => 6_000]);
    $variant = ProductVariant::factory()->for($product)->create(['size' => 'M', 'stock' => $stock]);
    $order = Order::factory()->for($user ?? User::factory())->create(['status' => $status]);
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

/** @return array<string, string> */
function expiryAddressPayload(): array
{
    return [
        'recipient_name' => '田中 葵',
        'postal_code' => '150-0001',
        'prefecture' => '東京都',
        'city' => '渋谷区',
        'address_line1' => '1-2-3',
        'phone' => '09012345678',
    ];
}

function intent(string $id, string $status): PaymentIntent
{
    return PaymentIntent::constructFrom(['id' => $id, 'object' => 'payment_intent', 'status' => $status]);
}

// --- orders:expire-pending ---

it('cancels pending orders past the TTL and restocks', function () {
    [$stale, $staleVariant] = reservedOrder(OrderStatus::Pending);
    $stale->forceFill(['created_at' => now()->subMinutes(31)])->save();

    [$fresh, $freshVariant] = reservedOrder(OrderStatus::Pending);
    $fresh->forceFill(['created_at' => now()->subMinutes(10)])->save();

    $this->artisan('orders:expire-pending')->assertSuccessful();

    expect($stale->fresh()->status)->toBe(OrderStatus::Cancelled)
        ->and($stale->fresh()->cancelled_at)->not->toBeNull()
        ->and($staleVariant->fresh()->stock)->toBe(10)
        ->and($fresh->fresh()->status)->toBe(OrderStatus::Pending)
        ->and($freshVariant->fresh()->stock)->toBe(8);
});

it('does not touch old orders that are no longer pending', function () {
    [$paid, $variant] = reservedOrder(OrderStatus::Paid);
    $paid->forceFill(['created_at' => now()->subDay()])->save();

    $this->artisan('orders:expire-pending')->assertSuccessful();

    expect($paid->fresh()->status)->toBe(OrderStatus::Paid)
        ->and($variant->fresh()->stock)->toBe(8);
});

it('cancels the Stripe PaymentIntent of an expired order', function () {
    [$order] = reservedOrder(OrderStatus::Pending);
    $order->forceFill(['created_at' => now()->subHour()])->save();
    Payment::factory()->for($order)->create(['stripe_payment_intent_id' => 'pi_exp_1']);

    $stripe = $this->mock(StripeService::class);
    $stripe->shouldReceive('retrievePaymentIntent')->once()->with('pi_exp_1')
        ->andReturn(intent('pi_exp_1', 'requires_payment_method'));
    $stripe->shouldReceive('cancelPaymentIntent')->once()->with('pi_exp_1')
        ->andReturn(intent('pi_exp_1', 'canceled'));

    $this->artisan('orders:expire-pending')->assertSuccessful();

    expect($order->fresh()->status)->toBe(OrderStatus::Cancelled)
        ->and($order->fresh()->payment->status)->toBe('canceled');
});

it('keeps an expired order pending while its payment is processing', function () {
    [$order, $variant] = reservedOrder(OrderStatus::Pending);
    $order->forceFill(['created_at' => now()->subHour()])->save();
    Payment::factory()->for($order)->create(['stripe_payment_intent_id' => 'pi_proc_1']);

    $stripe = $this->mock(StripeService::class);
    $stripe->shouldReceive('retrievePaymentIntent')->andReturn(intent('pi_proc_1', 'processing'));
    $stripe->shouldReceive('cancelPaymentIntent')->never();

    $this->artisan('orders:expire-pending')->assertSuccessful();

    expect($order->fresh()->status)->toBe(OrderStatus::Pending)
        ->and($variant->fresh()->stock)->toBe(8);
});

// --- 新しい注文による置き換え ---

it('cancels the users previous pending order when a new order is placed', function () {
    $user = User::factory()->create();
    [$previous, $previousVariant] = reservedOrder(OrderStatus::Pending, $user);
    [$othersOrder] = reservedOrder(OrderStatus::Pending);

    $this->actingAs($user)
        ->postJson('/api/orders', [
            'items' => [['variant_id' => $previousVariant->id, 'quantity' => 2]],
            'address' => expiryAddressPayload(),
        ])
        ->assertCreated();

    // 前の注文の 2 個が戻り、新しい注文で 2 個確保 → 在庫は 8 のまま（二重確保しない）
    expect($previous->fresh()->status)->toBe(OrderStatus::Cancelled)
        ->and($previousVariant->fresh()->stock)->toBe(8)
        ->and($othersOrder->fresh()->status)->toBe(OrderStatus::Pending);
});

it('throttles order creation per user', function () {
    $user = User::factory()->create();
    $variant = ProductVariant::factory()->for(Product::factory())->create(['stock' => 100]);

    foreach (range(1, 5) as $ignored) {
        $this->actingAs($user)
            ->postJson('/api/orders', [
                'items' => [['variant_id' => $variant->id, 'quantity' => 1]],
                'address' => expiryAddressPayload(),
            ])
            ->assertCreated();
    }

    $this->actingAs($user)
        ->postJson('/api/orders', [
            'items' => [['variant_id' => $variant->id, 'quantity' => 1]],
            'address' => expiryAddressPayload(),
        ])
        ->assertStatus(429);
});
