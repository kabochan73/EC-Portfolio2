<?php

use App\Models\Order;
use App\Models\Payment;
use App\Models\User;

it('lists only the current users orders, newest first', function () {
    $user = User::factory()->create();
    $older = Order::factory()->for($user)->withItems(1)->create();
    $newer = Order::factory()->for($user)->withItems(2)->create();
    Order::factory()->withItems(1)->create(); // another user

    $this->actingAs($user)
        ->getJson('/api/orders')
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0.order_number', $newer->order_number)
        ->assertJsonPath('data.1.order_number', $older->order_number)
        ->assertJsonStructure(['data' => [['order_number', 'status', 'total', 'item_count', 'placed_at']]]);
});

it('reports item_count as the sum of line quantities', function () {
    $user = User::factory()->create();
    $order = Order::factory()->for($user)->create();
    $order->items()->createMany([
        ['product_name' => 'A', 'variant_size' => 'M', 'unit_price' => 1000, 'quantity' => 2, 'line_total' => 2000],
        ['product_name' => 'B', 'variant_size' => 'L', 'unit_price' => 1500, 'quantity' => 3, 'line_total' => 4500],
    ]);

    $this->actingAs($user)
        ->getJson('/api/orders')
        ->assertOk()
        ->assertJsonPath('data.0.item_count', 5);
});

it('shows a single order with items and payment summary', function () {
    $user = User::factory()->create();
    $order = Order::factory()->for($user)->paid()->withItems(2)->create();
    Payment::factory()->for($order)->succeeded()->create(['last_error' => null]);

    $this->actingAs($user)
        ->getJson("/api/orders/{$order->order_number}")
        ->assertOk()
        ->assertJsonPath('data.order_number', $order->order_number)
        ->assertJsonPath('data.status', 'paid')
        ->assertJsonCount(2, 'data.items')
        ->assertJsonPath('data.payment.status', 'succeeded');
});

it('returns 404 for another users order number', function () {
    $me = User::factory()->create();
    $theirs = Order::factory()->create();

    $this->actingAs($me)
        ->getJson("/api/orders/{$theirs->order_number}")
        ->assertNotFound();
});

it('returns 404 for an unknown order number', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->getJson('/api/orders/EC-20000101-0001')
        ->assertNotFound();
});

it('requires authentication', function () {
    $this->getJson('/api/orders')->assertUnauthorized();
    $this->getJson('/api/orders/EC-20260101-0001')->assertUnauthorized();
});
