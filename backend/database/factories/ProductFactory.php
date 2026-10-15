<?php

namespace Database\Factories;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Product>
 */
class ProductFactory extends Factory
{
    public function definition(): array
    {
        $name = Str::title(fake()->unique()->words(3, true));

        return [
            'category_id' => Category::factory(),
            'name' => $name,
            'slug' => Str::slug($name).'-'.fake()->unique()->numberBetween(1, 99999),
            'price' => fake()->numberBetween(30, 500) * 100,
            'description' => fake()->paragraph(),
            'material' => '本体 綿100%',
            'care' => '洗濯機可（ネット使用）',
            'origin' => fake()->randomElement(['日本', '中国', 'ポルトガル']),
            'product_code' => 'EC-'.strtoupper(fake()->bothify('??####')),
            'size_chart' => [
                'unit' => 'cm',
                'columns' => ['着丈', '身幅', '肩幅', '袖丈'],
                'rows' => ['S' => [66, 52, 46, 20], 'M' => [68, 55, 48, 21], 'L' => [70, 58, 50, 22]],
            ],
            'is_published' => true,
            'position' => fake()->numberBetween(0, 20),
        ];
    }

    public function unpublished(): static
    {
        return $this->state(fn () => ['is_published' => false]);
    }

    public function noSizeChart(): static
    {
        return $this->state(fn () => ['size_chart' => null]);
    }
}
