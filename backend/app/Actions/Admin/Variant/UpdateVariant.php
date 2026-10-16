<?php

namespace App\Actions\Admin\Variant;

use App\Models\ProductVariant;

final class UpdateVariant
{
    /**
     * @param  array{color: ?string, sku: string, stock: int}  $data
     */
    public function execute(ProductVariant $variant, array $data): ProductVariant
    {
        // size は変更不可（docs/05-admin.md）
        $variant->update([
            'color' => $data['color'] ?? null,
            'sku' => $data['sku'],
            'stock' => $data['stock'],
        ]);

        return $variant;
    }
}
