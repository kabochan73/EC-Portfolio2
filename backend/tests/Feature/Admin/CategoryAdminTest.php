<?php

use App\Models\Category;
use App\Models\Product;
use App\Models\User;

it('rejects a non-admin with 403', function () {
    $this->actingAs(User::factory()->create())
        ->getJson('/api/admin/categories')
        ->assertForbidden();
});

it('rejects an unauthenticated request with 401', function () {
    $this->getJson('/api/admin/categories')->assertUnauthorized();
});

it('lists all categories in position order with product counts', function () {
    $tops = Category::factory()->create(['slug' => 'tops', 'position' => 1]);
    Category::factory()->create(['slug' => 'bottoms', 'position' => 0]);
    Product::factory()->for($tops)->count(2)->create();

    $this->actingAs(admin())
        ->getJson('/api/admin/categories')
        ->assertOk()
        ->assertJsonPath('data.0.slug', 'bottoms')
        ->assertJsonPath('data.1.slug', 'tops')
        ->assertJsonPath('data.1.products_count', 2);
});

it('creates a category and appends it at the end', function () {
    Category::factory()->create(['slug' => 'tops', 'position' => 0]);

    $this->actingAs(admin())
        ->postJson('/api/admin/categories', ['name' => 'Shoes', 'slug' => 'shoes'])
        ->assertCreated()
        ->assertJsonPath('data.slug', 'shoes')
        ->assertJsonPath('data.position', 1);
});

it('rejects a duplicate slug on create', function () {
    Category::factory()->create(['slug' => 'tops']);

    $this->actingAs(admin())
        ->postJson('/api/admin/categories', ['name' => 'Tops', 'slug' => 'tops'])
        ->assertStatus(422)
        ->assertJsonValidationErrorFor('slug');
});

it('updates a category, allowing it to keep its own slug', function () {
    $category = Category::factory()->create(['slug' => 'tops', 'name' => 'Tops']);

    $this->actingAs(admin())
        ->putJson("/api/admin/categories/{$category->id}", ['name' => 'Upper Body', 'slug' => 'tops'])
        ->assertOk()
        ->assertJsonPath('data.name', 'Upper Body');
});

it('deletes an empty category', function () {
    $category = Category::factory()->create(['slug' => 'tmp']);

    $this->actingAs(admin())
        ->deleteJson("/api/admin/categories/{$category->id}")
        ->assertNoContent();

    expect(Category::find($category->id))->toBeNull();
});

it('refuses to delete a category that still has products (409)', function () {
    $category = Category::factory()->create(['slug' => 'tops']);
    Product::factory()->for($category)->create();

    $this->actingAs(admin())
        ->deleteJson("/api/admin/categories/{$category->id}")
        ->assertStatus(409);

    expect(Category::find($category->id))->not->toBeNull();
});

it('reorders categories', function () {
    $a = Category::factory()->create(['slug' => 'a', 'position' => 0]);
    $b = Category::factory()->create(['slug' => 'b', 'position' => 1]);
    $c = Category::factory()->create(['slug' => 'c', 'position' => 2]);

    $this->actingAs(admin())
        ->putJson('/api/admin/categories/reorder', ['order' => [$c->id, $a->id, $b->id]])
        ->assertOk()
        ->assertJsonPath('data.0.slug', 'c')
        ->assertJsonPath('data.1.slug', 'a');

    expect($c->fresh()->position)->toBe(0)
        ->and($b->fresh()->position)->toBe(2);
});
