<?php

use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariant;

it('returns the full detail payload for a published product', function () {
    $category = Category::factory()->create(['slug' => 'tops', 'name' => 'Tops']);
    $product = Product::factory()->for($category)->create([
        'slug' => 'boxy-tee',
        'name' => 'Boxy Tee',
        'care' => '洗濯機可',
    ]);
    ProductVariant::factory()->for($product)->create(['size' => 'S', 'stock' => 10]);
    ProductVariant::factory()->for($product)->create(['size' => 'M', 'stock' => 0]);

    $this->getJson('/api/products/boxy-tee')
        ->assertOk()
        ->assertJsonPath('data.slug', 'boxy-tee')
        ->assertJsonPath('data.category.slug', 'tops')
        ->assertJsonStructure(['data' => [
            'id', 'name', 'slug', 'price', 'category' => ['name', 'slug'],
            'description', 'material', 'care', 'origin', 'product_code',
            'size_chart', 'is_new', 'images', 'colors', 'variants', 'related',
        ]])
        ->assertJsonPath('data.variants.1.stock_status', 'sold_out')
        ->assertJsonPath('data.variants.1.selectable', false);
});

it('does not expose raw stock on variants', function () {
    $category = Category::factory()->create(['slug' => 'tops']);
    $product = Product::factory()->for($category)->create(['slug' => 'p1']);
    ProductVariant::factory()->for($product)->create(['size' => 'S', 'stock' => 7]);

    $variant = $this->getJson('/api/products/p1')->assertOk()->json('data.variants.0');

    expect($variant)->not->toHaveKey('stock');
});

it('returns 404 for an unpublished product', function () {
    $category = Category::factory()->create(['slug' => 'tops']);
    Product::factory()->for($category)->unpublished()->create(['slug' => 'hidden']);

    $this->getJson('/api/products/hidden')->assertNotFound();
});

it('returns 404 for an unknown slug', function () {
    $this->getJson('/api/products/does-not-exist')->assertNotFound();
});

it('lists colors only when a variant carries one', function () {
    $category = Category::factory()->create(['slug' => 'tops']);

    $plain = Product::factory()->for($category)->create(['slug' => 'plain']);
    ProductVariant::factory()->for($plain)->create(['size' => 'S', 'color' => null]);

    $coloured = Product::factory()->for($category)->create(['slug' => 'coloured']);
    ProductVariant::factory()->for($coloured)->create(['size' => 'S', 'color' => 'Black']);
    ProductVariant::factory()->for($coloured)->create(['size' => 'S', 'color' => 'Ecru']);

    expect($this->getJson('/api/products/plain')->json('data.colors'))->toBe([]);
    expect($this->getJson('/api/products/coloured')->json('data.colors'))->toEqualCanonicalizing(['Black', 'Ecru']);
});

it('includes only other published products from the same category as related', function () {
    $tops = Category::factory()->create(['slug' => 'tops']);
    $bottoms = Category::factory()->create(['slug' => 'bottoms']);

    $target = Product::factory()->for($tops)->create(['slug' => 'target', 'position' => 0]);
    Product::factory()->for($tops)->create(['slug' => 'sibling-b', 'position' => 2]);
    Product::factory()->for($tops)->create(['slug' => 'sibling-a', 'position' => 1]);
    Product::factory()->for($tops)->unpublished()->create(['slug' => 'sibling-hidden']);
    Product::factory()->for($bottoms)->create(['slug' => 'other-category']);

    $related = $this->getJson('/api/products/target')->assertOk()->json('data.related');

    expect(collect($related)->pluck('slug')->all())->toBe(['sibling-a', 'sibling-b']);
});

it('returns a null size_chart when the product has none', function () {
    $category = Category::factory()->create(['slug' => 'accessories']);
    $product = Product::factory()->for($category)->noSizeChart()->create(['slug' => 'beanie']);
    ProductVariant::factory()->for($product)->create(['size' => 'FREE']);

    $this->getJson('/api/products/beanie')
        ->assertOk()
        ->assertJsonPath('data.size_chart', null);
});
