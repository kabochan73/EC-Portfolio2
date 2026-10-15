<?php

use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariant;

it('returns only published products, ordered by position', function () {
    $category = Category::factory()->create(['slug' => 'tops']);
    Product::factory()->for($category)->create(['name' => 'Second', 'position' => 2]);
    Product::factory()->for($category)->create(['name' => 'First', 'position' => 1]);
    Product::factory()->for($category)->unpublished()->create(['name' => 'Hidden', 'position' => 0]);

    $this->getJson('/api/products')
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0.name', 'First')
        ->assertJsonPath('data.1.name', 'Second');
});

it('filters by category slug', function () {
    $tops = Category::factory()->create(['slug' => 'tops']);
    $bottoms = Category::factory()->create(['slug' => 'bottoms']);
    Product::factory()->for($tops)->create();
    Product::factory()->for($tops)->create();
    Product::factory()->for($bottoms)->create();

    $this->getJson('/api/products?category=tops')
        ->assertOk()
        ->assertJsonCount(2, 'data');
});

it('rejects an unknown category slug', function () {
    $this->getJson('/api/products?category=nope')
        ->assertStatus(422)
        ->assertJsonValidationErrorFor('category');
});

it('with new=true returns only recent products, newest first', function () {
    $category = Category::factory()->create(['slug' => 'tops']);
    Product::factory()->for($category)->create(['name' => 'Old', 'created_at' => now()->subDays(60)]);
    Product::factory()->for($category)->create(['name' => 'Newer', 'created_at' => now()->subDays(2)]);
    Product::factory()->for($category)->create(['name' => 'Newest', 'created_at' => now()->subDay()]);

    $this->getJson('/api/products?new=true')
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0.name', 'Newest')
        ->assertJsonPath('data.1.name', 'Newer');
});

it('honours the limit parameter', function () {
    $category = Category::factory()->create(['slug' => 'tops']);
    Product::factory()->for($category)->count(5)->create();

    $this->getJson('/api/products?limit=3')
        ->assertOk()
        ->assertJsonCount(3, 'data');
});

it('computes stock_status from the combined variant stock and hides raw stock', function () {
    $category = Category::factory()->create(['slug' => 'tops']);
    $product = Product::factory()->for($category)->create();
    ProductVariant::factory()->for($product)->create(['stock' => 0, 'size' => 'S']);
    ProductVariant::factory()->for($product)->create(['stock' => 2, 'size' => 'M']); // 合算 2 → low_stock

    $response = $this->getJson('/api/products')->assertOk();

    $response->assertJsonPath('data.0.stock_status', 'low_stock');
    expect($response->json('data.0'))->not->toHaveKey('stock')
        ->and($response->json('data.0.images'))->toBeArray();
});

it('flags products created within the new-product window', function () {
    $category = Category::factory()->create(['slug' => 'tops']);
    Product::factory()->for($category)->create(['created_at' => now()->subDays(3)]);
    Product::factory()->for($category)->create(['created_at' => now()->subDays(40)]);

    $data = $this->getJson('/api/products')->assertOk()->json('data');

    expect(collect($data)->pluck('is_new')->sort()->values()->all())->toBe([false, true]);
});
