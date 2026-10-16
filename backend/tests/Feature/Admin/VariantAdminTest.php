<?php

use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;

function someProduct(): Product
{
    return Product::factory()->for(Category::factory()->create())->create();
}

it('creates a variant with an auto-assigned position', function () {
    $product = someProduct();
    ProductVariant::factory()->for($product)->create(['size' => 'S', 'position' => 0]);

    $this->actingAs(admin())
        ->postJson("/api/admin/products/{$product->id}/variants", [
            'size' => 'M', 'color' => null, 'sku' => 'EC-TP-M', 'stock' => 12,
        ])
        ->assertCreated()
        ->assertJsonPath('data.size', 'M')
        ->assertJsonPath('data.stock', 12)
        ->assertJsonPath('data.position', 1);
});

it('rejects a duplicate size + null color combination', function () {
    $product = someProduct();
    ProductVariant::factory()->for($product)->create(['size' => 'M', 'color' => null]);

    $this->actingAs(admin())
        ->postJson("/api/admin/products/{$product->id}/variants", [
            'size' => 'M', 'color' => null, 'sku' => 'EC-TP-M2', 'stock' => 1,
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrorFor('size');
});

it('allows the same size with a different color', function () {
    $product = someProduct();
    ProductVariant::factory()->for($product)->create(['size' => 'M', 'color' => 'Black']);

    $this->actingAs(admin())
        ->postJson("/api/admin/products/{$product->id}/variants", [
            'size' => 'M', 'color' => 'Ecru', 'sku' => 'EC-TP-M-ECR', 'stock' => 3,
        ])
        ->assertCreated();
});

it('rejects a duplicate sku', function () {
    $product = someProduct();
    ProductVariant::factory()->for($product)->create(['sku' => 'DUP-SKU']);

    $this->actingAs(admin())
        ->postJson("/api/admin/products/{$product->id}/variants", [
            'size' => 'L', 'color' => null, 'sku' => 'DUP-SKU', 'stock' => 1,
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrorFor('sku');
});

it('updates stock and sku but never the size', function () {
    $product = someProduct();
    $variant = ProductVariant::factory()->for($product)->create(['size' => 'S', 'sku' => 'OLD', 'stock' => 5]);

    $this->actingAs(admin())
        ->putJson("/api/admin/variants/{$variant->id}", [
            'size' => 'L', // 無視される
            'color' => 'Navy', 'sku' => 'NEW', 'stock' => 20,
        ])
        ->assertOk()
        ->assertJsonPath('data.size', 'S')
        ->assertJsonPath('data.sku', 'NEW')
        ->assertJsonPath('data.stock', 20);
});

it('rejects an update whose new color collides with a sibling', function () {
    $product = someProduct();
    ProductVariant::factory()->for($product)->create(['size' => 'M', 'color' => 'Black']);
    $target = ProductVariant::factory()->for($product)->create(['size' => 'M', 'color' => 'Ecru']);

    $this->actingAs(admin())
        ->putJson("/api/admin/variants/{$target->id}", [
            'color' => 'Black', 'sku' => $target->sku, 'stock' => 1,
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrorFor('color');
});

it('deletes a variant, keeping order item snapshots', function () {
    $product = someProduct();
    $variant = ProductVariant::factory()->for($product)->create();
    $item = Order::factory()->create()->items()->create([
        'product_id' => $product->id,
        'product_variant_id' => $variant->id,
        'product_name' => $product->name,
        'variant_size' => $variant->size,
        'unit_price' => 1000, 'quantity' => 1, 'line_total' => 1000,
    ]);

    $this->actingAs(admin())
        ->deleteJson("/api/admin/variants/{$variant->id}")
        ->assertNoContent();

    expect(ProductVariant::find($variant->id))->toBeNull()
        ->and($item->fresh()->product_variant_id)->toBeNull()
        ->and($item->fresh()->variant_size)->toBe($variant->size);
});

it('exposes images and variants on the admin product detail', function () {
    $product = someProduct();
    ProductVariant::factory()->for($product)->create(['size' => 'S', 'position' => 0]);
    ProductVariant::factory()->for($product)->create(['size' => 'M', 'position' => 1]);

    $this->actingAs(admin())
        ->getJson("/api/admin/products/{$product->id}")
        ->assertOk()
        ->assertJsonCount(2, 'data.variants')
        ->assertJsonPath('data.variants.0.size', 'S')
        ->assertJsonStructure(['data' => ['variants' => [['id', 'size', 'color', 'sku', 'stock', 'position']], 'images']]);
});

it('rejects a non-admin', function () {
    $product = someProduct();

    $this->actingAs(User::factory()->create())
        ->postJson("/api/admin/products/{$product->id}/variants", [
            'size' => 'M', 'sku' => 'X', 'stock' => 1,
        ])
        ->assertForbidden();
});
