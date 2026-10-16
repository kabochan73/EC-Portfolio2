<?php

namespace App\Actions\Admin\Product;

use App\Models\Product;

final class UpdateProduct
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(Product $product, array $data): Product
    {
        $product->update($data);

        return $product;
    }
}
