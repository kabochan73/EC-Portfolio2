<?php

namespace App\Actions\Admin\ProductImage;

use App\Models\Product;
use App\Models\ProductImage;
use App\Services\StorageService;
use Illuminate\Http\UploadedFile;

final class CreateProductImage
{
    public function __construct(private readonly StorageService $storage) {}

    public function execute(Product $product, UploadedFile $file, string $alt = ''): ProductImage
    {
        $key = $this->storage->put("products/{$product->id}", $file);

        return $product->images()->create([
            'path' => $key,
            'alt' => $alt,
            'position' => (int) ($product->images()->max('position') ?? -1) + 1,
        ]);
    }
}
