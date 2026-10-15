<?php

use App\Models\Category;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use App\Services\StripeService;
use Stripe\PaymentIntent;

/**
 * total = subtotal + shipping。price 6000 x qty 1 = 6000 → shipping 800 → total 6800。
 *
 * @return array{0: User, 1: Order}
 */
function pendingOrderForPayment(int $price = 6_000, int $qty = 1): array
{
    $user = User::factory()->create();
    $category = Category::factory()->create(['slug' => 'tops']);
    $product = Product::factory()->for($category)->create(['price' => $price]);
    $variant = ProductVariant::factory()->for($product)->create(['size' => 'M', 'stock' => 10]);

    $subtotal = $price * $qty;
    $shipping = $subtotal >= 20_000 ? 0 : 800;

    $order = Order::factory()->for($user)->create([
        'subtotal' => $subtotal,
        'shipping_fee' => $shipping,
        'total' => $subtotal + $shipping,
    ]);
    $order->items()->create([
        'product_id' => $product->id,
        'product_variant_id' => $variant->id,
        'product_name' => $product->name,
        'variant_size' => 'M',
        'unit_price' => $price,
        'quantity' => $qty,
        'line_total' => $subtotal,
    ]);

    return [$user, $order];
}

function fakeStripeIntent(string $id = 'pi_test_123', string $status = 'requires_payment_method'): PaymentIntent
{
    return PaymentIntent::constructFrom([
        'id' => $id,
        'status' => $status,
        'client_secret' => $id.'_secret_abc',
    ]);
}

it('creates a payment intent for the owner of a pending order', function () {
    [$user, $order] = pendingOrderForPayment();

    $this->mock(StripeService::class)
        ->shouldReceive('createPaymentIntent')->once()
        ->andReturn(fakeStripeIntent());

    $this->actingAs($user)
        ->postJson('/api/checkout/payment-intent', ['order_number' => $order->order_number])
        ->assertOk()
        ->assertJsonPath('data.client_secret', 'pi_test_123_secret_abc')
        ->assertJsonPath('data.publishable_key', 'pk_test_dummy');

    expect($order->fresh()->payment)->not->toBeNull()
        ->and($order->fresh()->payment->stripe_payment_intent_id)->toBe('pi_test_123');
});

it('reuses the existing payment intent on a second call', function () {
    [$user, $order] = pendingOrderForPayment();
    Payment::factory()->for($order)->create(['stripe_payment_intent_id' => 'pi_existing']);

    $mock = $this->mock(StripeService::class);
    $mock->shouldReceive('createPaymentIntent')->never();
    $mock->shouldReceive('retrievePaymentIntent')->once()
        ->with('pi_existing')
        ->andReturn(fakeStripeIntent('pi_existing'));

    $this->actingAs($user)
        ->postJson('/api/checkout/payment-intent', ['order_number' => $order->order_number])
        ->assertOk()
        ->assertJsonPath('data.client_secret', 'pi_existing_secret_abc');

    expect($order->fresh()->payment()->count())->toBe(1);
});

it('returns 409 when the order is not pending', function () {
    [$user, $order] = pendingOrderForPayment();
    $order->update(['status' => 'paid']);

    $this->mock(StripeService::class)->shouldReceive('createPaymentIntent')->never();

    $this->actingAs($user)
        ->postJson('/api/checkout/payment-intent', ['order_number' => $order->order_number])
        ->assertStatus(409)
        ->assertJsonPath('status', 'paid');
});

it('returns 409 when the catalog price changed after the order was placed', function () {
    [$user, $order] = pendingOrderForPayment(price: 6_000);
    // カタログ価格を変更（注文明細の unit_price は据え置き）
    $order->items->first()->variant->product->update(['price' => 7_000]);

    $this->mock(StripeService::class)->shouldReceive('createPaymentIntent')->never();

    $this->actingAs($user)
        ->postJson('/api/checkout/payment-intent', ['order_number' => $order->order_number])
        ->assertStatus(409);
});

it('returns 503 when Stripe is not configured', function () {
    config(['services.stripe.secret' => '']);
    [$user, $order] = pendingOrderForPayment();

    $this->actingAs($user)
        ->postJson('/api/checkout/payment-intent', ['order_number' => $order->order_number])
        ->assertStatus(503);
});

it('returns 404 for another users order', function () {
    [, $order] = pendingOrderForPayment();
    $intruder = User::factory()->create();

    $this->actingAs($intruder)
        ->postJson('/api/checkout/payment-intent', ['order_number' => $order->order_number])
        ->assertNotFound();
});

it('requires authentication', function () {
    $this->postJson('/api/checkout/payment-intent', ['order_number' => 'EC-x'])->assertUnauthorized();
});
