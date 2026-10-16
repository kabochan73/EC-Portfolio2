<?php

namespace App\Actions\Admin\Variant;

use App\Models\ProductVariant;

/**
 * バリアント削除（docs/05-admin.md）。注文で参照済みでも
 * order_items.product_variant_id は SET NULL（スナップショットは残る）。
 */
final class DeleteVariant
{
    public function execute(ProductVariant $variant): void
    {
        $variant->delete();
    }
}
