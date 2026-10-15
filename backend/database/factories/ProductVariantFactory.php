<?php

namespace Database\Factories;

use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<ProductVariant>
 */
class ProductVariantFactory extends Factory
{
    public function definition(): array
    {
        return [
            'product_id' => Product::factory(),
            'size' => fake()->randomElement(['S', 'M', 'L']),
            'color' => null,
            'sku' => strtoupper(Str::random(10)),
            'stock' => fake()->numberBetween(0, 30),
            'position' => 0,
        ];
    }

    public function size(string $size, int $position = 0): static
    {
        return $this->state(fn () => ['size' => $size, 'position' => $position]);
    }

    public function color(string $color): static
    {
        return $this->state(fn () => ['color' => $color]);
    }

    public function stock(int $stock): static
    {
        return $this->state(fn () => ['stock' => $stock]);
    }

    public function soldOut(): static
    {
        return $this->state(fn () => ['stock' => 0]);
    }

    public function lowStock(): static
    {
        return $this->state(fn () => ['stock' => fake()->numberBetween(1, (int) config('shop.low_stock_threshold'))]);
    }
}
