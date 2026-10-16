<?php

namespace App\Actions\Admin\Variant;

use App\Models\Product;
use App\Models\ProductVariant;

final class CreateVariant
{
    /**
     * @param  array{size: string, color: ?string, sku: string, stock: int}  $data
     */
    public function execute(Product $product, array $data): ProductVariant
    {
        return $product->variants()->create([
            'size' => $data['size'],
            'color' => $data['color'] ?? null,
            'sku' => $data['sku'],
            'stock' => $data['stock'],
            'position' => (int) ($product->variants()->max('position') ?? -1) + 1,
        ]);
    }
}
