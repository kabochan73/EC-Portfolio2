<?php

namespace Database\Factories;

use App\Models\SiteContent;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SiteContent>
 */
class SiteContentFactory extends Factory
{
    public function definition(): array
    {
        $key = fake()->randomElement(SiteContent::KEYS);

        return [
            'key' => $key,
            'data' => SiteContent::defaults($key),
            'updated_by' => null,
        ];
    }

    public function key(string $key): static
    {
        return $this->state(fn () => [
            'key' => $key,
            'data' => SiteContent::defaults($key),
        ]);
    }
}
