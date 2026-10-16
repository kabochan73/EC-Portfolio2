<?php

namespace App\Actions\Admin\Product;

use App\Models\Product;

final class CreateProduct
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(array $data): Product
    {
        return Product::create([
            ...$data,
            'position' => $data['position'] ?? (int) (Product::max('position') ?? -1) + 1,
        ]);
    }
}
