<?php

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\Payment;
use App\Models\User;

it('lists every users order, newest first, with customer info', function () {
    $alice = User::factory()->create(['name' => 'Alice']);
    $bob = User::factory()->create(['name' => 'Bob']);
    $older = Order::factory()->for($alice)->withItems(1)->create();
    $newer = Order::factory()->for($bob)->create();
    $newer->items()->createMany([
        ['product_name' => 'A', 'variant_size' => 'M', 'unit_price' => 1000, 'quantity' => 2, 'line_total' => 2000],
        ['product_name' => 'B', 'variant_size' => 'L', 'unit_price' => 1500, 'quantity' => 1, 'line_total' => 1500],
    ]);

    $this->actingAs(admin())
        ->getJson('/api/admin/orders')
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0.order_number', $newer->order_number)
        ->assertJsonPath('data.0.customer.name', 'Bob')
        ->assertJsonPath('data.0.item_count', 3)
        ->assertJsonPath('data.1.order_number', $older->order_number);
});

it('filters by status', function () {
    Order::factory()->paid()->create();
    Order::factory()->pending()->create();
    Order::factory()->cancelled()->create();

    $this->actingAs(admin())
        ->getJson('/api/admin/orders?status=paid')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.status', 'paid');
});

it('rejects an unknown status filter', function () {
    $this->actingAs(admin())
        ->getJson('/api/admin/orders?status=nope')
        ->assertStatus(422);
});

it('filters by customer_id', function () {
    $alice = User::factory()->create();
    $bob = User::factory()->create();
    $aliceOrder = Order::factory()->for($alice)->create();
    Order::factory()->for($bob)->count(2)->create();

    $this->actingAs(admin())
        ->getJson("/api/admin/orders?customer_id={$alice->id}")
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.order_number', $aliceOrder->order_number);
});

it('shows a single order with items, customer and payment details', function () {
    $customer = User::factory()->create(['email' => 'buyer@example.com']);
    $order = Order::factory()->for($customer)->paid()->withItems(2)->create();
    Payment::factory()->for($order)->succeeded()->create([
        'stripe_payment_intent_id' => 'pi_admin_1',
        'last_error' => null,
    ]);

    $this->actingAs(admin())
        ->getJson("/api/admin/orders/{$order->order_number}")
        ->assertOk()
        ->assertJsonPath('data.customer.email', 'buyer@example.com')
        ->assertJsonCount(2, 'data.items')
        ->assertJsonPath('data.payment.stripe_payment_intent_id', 'pi_admin_1')
        ->assertJsonPath('data.status', 'paid');
});

it('returns 404 for an unknown order number', function () {
    $this->actingAs(admin())
        ->getJson('/api/admin/orders/EC-20000101-0001')
        ->assertNotFound();
});

it('rejects a non-admin', function () {
    Order::factory()->create();

    $this->actingAs(User::factory()->create())
        ->getJson('/api/admin/orders')
        ->assertForbidden();
});

it('exposes all the documented statuses', function () {
    expect(collect(OrderStatus::cases())->map->value->all())
        ->toBe(['pending', 'paid', 'shipped', 'completed', 'cancelled']);
});
