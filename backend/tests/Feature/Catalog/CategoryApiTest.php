<?php

use App\Models\Category;

it('returns categories ordered by position', function () {
    Category::factory()->create(['name' => 'Outerwear', 'slug' => 'outerwear', 'position' => 2]);
    Category::factory()->create(['name' => 'Tops', 'slug' => 'tops', 'position' => 0]);
    Category::factory()->create(['name' => 'Bottoms', 'slug' => 'bottoms', 'position' => 1]);

    $this->getJson('/api/categories')
        ->assertOk()
        ->assertJsonCount(3, 'data')
        ->assertJsonPath('data.0.slug', 'tops')
        ->assertJsonPath('data.1.slug', 'bottoms')
        ->assertJsonPath('data.2.slug', 'outerwear');
});

it('exposes only id, name and slug', function () {
    Category::factory()->create(['slug' => 'tops']);

    $this->getJson('/api/categories')
        ->assertOk()
        ->assertJsonStructure(['data' => [['id', 'name', 'slug']]])
        ->assertJsonMissingPath('data.0.position')
        ->assertJsonMissingPath('data.0.created_at');
});

it('returns an empty list when there are no categories', function () {
    $this->getJson('/api/categories')
        ->assertOk()
        ->assertExactJson(['data' => []]);
});
