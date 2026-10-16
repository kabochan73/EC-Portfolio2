<?php

use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;

function productPayload(Category $category, array $overrides = []): array
{
    return array_merge([
        'category_id' => $category->id,
        'name' => 'Boxy Tee',
        'slug' => 'boxy-tee',
        'price' => 12_000,
        'description' => '無駄をそぎ落とした定番。',
        'material' => '本体 綿100%',
        'care' => '洗濯機可',
        'origin' => '日本',
        'product_code' => 'EC-TP0001',
        'size_chart' => null,
        'is_published' => true,
    ], $overrides);
}

it('lists published and unpublished products with stock totals', function () {
    $category = Category::factory()->create(['slug' => 'tops']);
    $published = Product::factory()->for($category)->create(['name' => 'Shown', 'position' => 0]);
    ProductVariant::factory()->for($published)->create(['size' => 'S', 'stock' => 4]);
    ProductVariant::factory()->for($published)->create(['size' => 'M', 'stock' => 6]);
    Product::factory()->for($category)->unpublished()->create(['name' => 'Hidden', 'position' => 1]);

    $this->actingAs(admin())
        ->getJson('/api/admin/products')
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0.total_stock', 10)
        ->assertJsonPath('data.0.variant_count', 2);
});

it('searches by name (case-insensitive) and filters by category', function () {
    $tops = Category::factory()->create(['slug' => 'tops']);
    $bottoms = Category::factory()->create(['slug' => 'bottoms']);
    Product::factory()->for($tops)->create(['name' => 'Linen Shirt']);
    Product::factory()->for($tops)->create(['name' => 'Wool Sweater']);
    Product::factory()->for($bottoms)->create(['name' => 'Linen Trousers']);

    $this->actingAs(admin())
        ->getJson('/api/admin/products?q=linen')
        ->assertOk()
        ->assertJsonCount(2, 'data');

    $this->actingAs(admin())
        ->getJson('/api/admin/products?category=bottoms')
        ->assertOk()
        ->assertJsonCount(1, 'data');
});

it('creates a product and appends its position', function () {
    $category = Category::factory()->create(['slug' => 'tops']);
    Product::factory()->for($category)->create(['position' => 5]);

    $this->actingAs(admin())
        ->postJson('/api/admin/products', productPayload($category))
        ->assertCreated()
        ->assertJsonPath('data.slug', 'boxy-tee')
        ->assertJsonPath('data.position', 6);
});

it('rejects a duplicate slug', function () {
    $category = Category::factory()->create(['slug' => 'tops']);
    Product::factory()->for($category)->create(['slug' => 'boxy-tee']);

    $this->actingAs(admin())
        ->postJson('/api/admin/products', productPayload($category, ['slug' => 'boxy-tee']))
        ->assertStatus(422)
        ->assertJsonValidationErrorFor('slug');
});

it('rejects an unknown category_id', function () {
    $category = Category::factory()->create(['slug' => 'tops']);

    $this->actingAs(admin())
        ->postJson('/api/admin/products', productPayload($category, ['category_id' => 99999]))
        ->assertStatus(422)
        ->assertJsonValidationErrorFor('category_id');
});

it('returns raw values for the edit form', function () {
    $category = Category::factory()->create(['slug' => 'tops']);
    $product = Product::factory()->for($category)->create(['is_published' => false]);

    $this->actingAs(admin())
        ->getJson("/api/admin/products/{$product->id}")
        ->assertOk()
        ->assertJsonPath('data.category_id', $category->id)
        ->assertJsonPath('data.is_published', false);
});

it('updates a product', function () {
    $category = Category::factory()->create(['slug' => 'tops']);
    $product = Product::factory()->for($category)->create(['slug' => 'boxy-tee', 'name' => 'Old']);

    $this->actingAs(admin())
        ->putJson("/api/admin/products/{$product->id}", productPayload($category, ['name' => 'New Name']))
        ->assertOk()
        ->assertJsonPath('data.name', 'New Name');
});

it('deletes a product but keeps order item snapshots', function () {
    $category = Category::factory()->create(['slug' => 'tops']);
    $product = Product::factory()->for($category)->create();
    $item = Order::factory()->create()->items()->create([
        'product_id' => $product->id,
        'product_name' => $product->name,
        'variant_size' => 'M',
        'unit_price' => 1000,
        'quantity' => 1,
        'line_total' => 1000,
    ]);

    $this->actingAs(admin())
        ->deleteJson("/api/admin/products/{$product->id}")
        ->assertNoContent();

    expect(Product::find($product->id))->toBeNull()
        ->and($item->fresh()->product_id)->toBeNull()
        ->and($item->fresh()->product_name)->toBe($product->name);
});

it('rejects a non-admin', function () {
    $this->actingAs(User::factory()->create())
        ->getJson('/api/admin/products')
        ->assertForbidden();
});
