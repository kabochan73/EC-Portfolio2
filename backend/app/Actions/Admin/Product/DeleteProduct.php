<?php

namespace App\Actions\Admin\Product;

use App\Models\Product;

/**
 * 商品削除（docs/05-admin.md）。
 * order_items.product_id は SET NULL（注文履歴のスナップショットは残る）。
 * product_images / product_variants は CASCADE。
 * バケット上の画像実体の掃除は、画像管理（StorageService）を作る Step 25 で足す。
 */
final class DeleteProduct
{
    public function execute(Product $product): void
    {
        $product->delete();
    }
}
