<?php

use App\Models\Category;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\ProductVariant;
use Illuminate\Testing\TestResponse;

function validateCart(array $variantIds): TestResponse
{
    $query = http_build_query(['variant_ids' => $variantIds]);

    return test()->getJson("/api/cart/validate?{$query}");
}

it('returns current price, stock and product info for a published variant', function () {
    $category = Category::factory()->create(['slug' => 'tops']);
    $product = Product::factory()->for($category)->create(['price' => 12000, 'slug' => 'tee', 'name' => 'Tee']);
    ProductImage::factory()->for($product)->create(['position' => 0, 'path' => 'products/1/a.jpg']);
    $variant = ProductVariant::factory()->for($product)->create(['size' => 'M', 'color' => 'Black', 'stock' => 8]);

    validateCart([$variant->id])
        ->assertOk()
        ->assertJsonPath('data.0.variant_id', $variant->id)
        ->assertJsonPath('data.0.available', true)
        ->assertJsonPath('data.0.price', 12000)
        ->assertJsonPath('data.0.stock_status', 'in_stock')
        ->assertJsonPath('data.0.max_quantity', 8)
        ->assertJsonPath('data.0.product_name', 'Tee')
        ->assertJsonPath('data.0.product_slug', 'tee')
        ->assertJsonPath('data.0.size', 'M')
        ->assertJsonPath('data.0.color', 'Black')
        ->assertJsonPath('data.0.image_url', '/media/products/1/a.jpg');
});

it('caps max_quantity at the per-line limit', function () {
    $category = Category::factory()->create(['slug' => 'tops']);
    $product = Product::factory()->for($category)->create();
    $variant = ProductVariant::factory()->for($product)->create(['stock' => 50]);

    validateCart([$variant->id])
        ->assertOk()
        ->assertJsonPath('data.0.max_quantity', config('shop.cart_max_quantity_per_line'));
});

it('reports a sold-out variant as available with zero max quantity', function () {
    $category = Category::factory()->create(['slug' => 'tops']);
    $product = Product::factory()->for($category)->create();
    $variant = ProductVariant::factory()->for($product)->soldOut()->create();

    validateCart([$variant->id])
        ->assertOk()
        ->assertJsonPath('data.0.available', true)
        ->assertJsonPath('data.0.stock_status', 'sold_out')
        ->assertJsonPath('data.0.max_quantity', 0);
});

it('marks a variant of an unpublished product as unavailable', function () {
    $category = Category::factory()->create(['slug' => 'tops']);
    $product = Product::factory()->for($category)->unpublished()->create();
    $variant = ProductVariant::factory()->for($product)->create(['stock' => 5]);

    validateCart([$variant->id])
        ->assertOk()
        ->assertJsonPath('data.0', ['variant_id' => $variant->id, 'available' => false]);
});

it('marks an unknown variant id as unavailable', function () {
    validateCart([999999])
        ->assertOk()
        ->assertJsonPath('data.0', ['variant_id' => 999999, 'available' => false]);
});

it('validates several variants at once, preserving request order', function () {
    $category = Category::factory()->create(['slug' => 'tops']);
    $product = Product::factory()->for($category)->create();
    $a = ProductVariant::factory()->for($product)->create(['size' => 'S', 'stock' => 3]);
    $b = ProductVariant::factory()->for($product)->create(['size' => 'M', 'stock' => 0]);

    validateCart([$b->id, $a->id, 123456])
        ->assertOk()
        ->assertJsonCount(3, 'data')
        ->assertJsonPath('data.0.variant_id', $b->id)
        ->assertJsonPath('data.1.variant_id', $a->id)
        ->assertJsonPath('data.2.available', false);
});

it('requires at least one variant id', function () {
    test()->getJson('/api/cart/validate')
        ->assertStatus(422)
        ->assertJsonValidationErrorFor('variant_ids');
});
