<?php

namespace Database\Factories;

use App\Models\Product;
use App\Models\ProductImage;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<ProductImage>
 */
class ProductImageFactory extends Factory
{
    public function definition(): array
    {
        return [
            'product_id' => Product::factory(),
            'path' => 'products/'.fake()->numberBetween(1, 999).'/'.Str::ulid().'.jpg',
            'alt' => fake()->words(3, true),
            'position' => 0,
        ];
    }

    public function position(int $position): static
    {
        return $this->state(fn () => ['position' => $position]);
    }
}
