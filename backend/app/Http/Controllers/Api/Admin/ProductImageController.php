<?php

namespace App\Http\Controllers\Api\Admin;

use App\Actions\Admin\ProductImage\CreateProductImage;
use App\Actions\Admin\ProductImage\DeleteProductImage;
use App\Actions\Admin\ProductImage\ReorderProductImages;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ProductImage\ReorderProductImagesRequest;
use App\Http\Requests\Admin\ProductImage\StoreProductImageRequest;
use App\Http\Resources\Shop\ProductImageResource;
use App\Models\Product;
use App\Models\ProductImage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ProductImageController extends Controller
{
    public function store(StoreProductImageRequest $request, Product $product, CreateProductImage $createProductImage): JsonResponse
    {
        $image = $createProductImage->execute(
            $product,
            $request->file('image'),
            (string) $request->input('alt', ''),
        );

        return ProductImageResource::make($image)->response()->setStatusCode(201);
    }

    public function reorder(ReorderProductImagesRequest $request, Product $product, ReorderProductImages $reorderProductImages): AnonymousResourceCollection
    {
        $reorderProductImages->execute($product, array_map('intval', $request->validated('order')));

        return ProductImageResource::collection($product->images()->orderBy('position')->get());
    }

    public function destroy(ProductImage $productImage, DeleteProductImage $deleteProductImage): JsonResponse
    {
        $deleteProductImage->execute($productImage);

        return response()->json(status: 204);
    }
}
