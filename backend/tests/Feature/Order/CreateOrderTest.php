<?php

use App\Enums\OrderStatus;
use App\Models\Address;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;

/**
 * @return array{0: User, 1: ProductVariant}
 */
function customerWithVariant(int $stock = 10, int $price = 12_000): array
{
    $user = User::factory()->create();
    $category = Category::factory()->create(['slug' => 'tops']);
    $product = Product::factory()->for($category)->create(['price' => $price]);
    $variant = ProductVariant::factory()->for($product)->create(['size' => 'M', 'stock' => $stock]);

    return [$user, $variant];
}

function newAddressPayload(): array
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

it('creates a pending order and reserves stock', function () {
    [$user, $variant] = customerWithVariant(stock: 10, price: 6_000);

    $this->actingAs($user)
        ->postJson('/api/orders', [
            'items' => [['variant_id' => $variant->id, 'quantity' => 2]],
            'address' => newAddressPayload(),
        ])
        ->assertCreated()
        ->assertJsonPath('data.status', 'pending')
        ->assertJsonPath('data.subtotal', 12_000)
        ->assertJsonPath('data.shipping_fee', 800)
        ->assertJsonPath('data.total', 12_800)
        ->assertJsonPath('data.items.0.quantity', 2)
        ->assertJsonPath('data.shipping_address.recipient_name', '田中 葵')
        ->assertJsonPath('data.order_number', fn ($n) => str_starts_with((string) $n, 'EC-'));

    expect($variant->fresh()->stock)->toBe(8)
        ->and($user->orders()->first()->status)->toBe(OrderStatus::Pending);
});

it('applies free shipping at or above the threshold', function () {
    [$user, $variant] = customerWithVariant(stock: 10, price: 20_000);

    $this->actingAs($user)
        ->postJson('/api/orders', [
            'items' => [['variant_id' => $variant->id, 'quantity' => 1]],
            'address' => newAddressPayload(),
        ])
        ->assertCreated()
        ->assertJsonPath('data.shipping_fee', 0)
        ->assertJsonPath('data.total', 20_000);
});

it('rejects the order and rolls back when stock is insufficient', function () {
    [$user, $variant] = customerWithVariant(stock: 1);

    $this->actingAs($user)
        ->postJson('/api/orders', [
            'items' => [['variant_id' => $variant->id, 'quantity' => 5]],
            'address' => newAddressPayload(),
        ])
        ->assertStatus(422)
        ->assertJsonPath('shortages.0.variant_id', $variant->id)
        ->assertJsonPath('shortages.0.available', 1);

    expect($variant->fresh()->stock)->toBe(1)
        ->and($user->orders()->count())->toBe(0);
});

it('rejects the order when an unpublished product is included', function () {
    $user = User::factory()->create();
    $category = Category::factory()->create(['slug' => 'tops']);
    $product = Product::factory()->for($category)->unpublished()->create();
    $variant = ProductVariant::factory()->for($product)->create(['stock' => 10]);

    $this->actingAs($user)
        ->postJson('/api/orders', [
            'items' => [['variant_id' => $variant->id, 'quantity' => 1]],
            'address' => newAddressPayload(),
        ])
        ->assertStatus(422)
        ->assertJsonPath('unavailable_product_ids.0', $product->id);

    expect($user->orders()->count())->toBe(0);
});

it('ignores any client-supplied amounts and recomputes on the server', function () {
    [$user, $variant] = customerWithVariant(stock: 10, price: 12_000);

    $this->actingAs($user)
        ->postJson('/api/orders', [
            'items' => [['variant_id' => $variant->id, 'quantity' => 1]],
            'address' => newAddressPayload(),
            'subtotal' => 1,
            'total' => 1,
            'shipping_fee' => 0,
        ])
        ->assertCreated()
        ->assertJsonPath('data.subtotal', 12_000)
        ->assertJsonPath('data.total', 12_800);
});

it('uses a saved address by id', function () {
    $user = User::factory()->create();
    $category = Category::factory()->create(['slug' => 'tops']);
    $product = Product::factory()->for($category)->create(['price' => 10_000]);
    $variant = ProductVariant::factory()->for($product)->create(['stock' => 5]);
    $address = Address::factory()->for($user)->create(['recipient_name' => '保存済み 太郎']);

    $this->actingAs($user)
        ->postJson('/api/orders', [
            'items' => [['variant_id' => $variant->id, 'quantity' => 1]],
            'address_id' => $address->id,
        ])
        ->assertCreated()
        ->assertJsonPath('data.shipping_address.recipient_name', '保存済み 太郎');
});

it('rejects another users address id', function () {
    [$user, $variant] = customerWithVariant();
    $theirs = Address::factory()->create();

    $this->actingAs($user)
        ->postJson('/api/orders', [
            'items' => [['variant_id' => $variant->id, 'quantity' => 1]],
            'address_id' => $theirs->id,
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrorFor('address_id');
});

it('saves a new address when save_address is true', function () {
    [$user, $variant] = customerWithVariant();

    $this->actingAs($user)
        ->postJson('/api/orders', [
            'items' => [['variant_id' => $variant->id, 'quantity' => 1]],
            'address' => newAddressPayload(),
            'save_address' => true,
        ])
        ->assertCreated();

    expect($user->addresses()->count())->toBe(1)
        ->and($user->addresses()->first()->is_default)->toBeTrue();
});

it('does not save a new address by default', function () {
    [$user, $variant] = customerWithVariant();

    $this->actingAs($user)
        ->postJson('/api/orders', [
            'items' => [['variant_id' => $variant->id, 'quantity' => 1]],
            'address' => newAddressPayload(),
        ])
        ->assertCreated();

    expect($user->addresses()->count())->toBe(0);
});

it('requires authentication', function () {
    $this->postJson('/api/orders', [])->assertUnauthorized();
});
