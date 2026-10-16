<?php

namespace App\Http\Controllers\Api\Admin;

use App\Actions\Admin\Variant\CreateVariant;
use App\Actions\Admin\Variant\DeleteVariant;
use App\Actions\Admin\Variant\UpdateVariant;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Variant\StoreVariantRequest;
use App\Http\Requests\Admin\Variant\UpdateVariantRequest;
use App\Http\Resources\Admin\ProductVariantResource;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Http\JsonResponse;

class VariantController extends Controller
{
    public function store(StoreVariantRequest $request, Product $product, CreateVariant $createVariant): JsonResponse
    {
        $variant = $createVariant->execute($product, [
            'size' => $request->string('size')->toString(),
            'color' => $request->input('color'),
            'sku' => $request->string('sku')->toString(),
            'stock' => $request->integer('stock'),
        ]);

        return ProductVariantResource::make($variant)->response()->setStatusCode(201);
    }

    public function update(UpdateVariantRequest $request, ProductVariant $variant, UpdateVariant $updateVariant): ProductVariantResource
    {
        $updateVariant->execute($variant, [
            'color' => $request->input('color'),
            'sku' => $request->string('sku')->toString(),
            'stock' => $request->integer('stock'),
        ]);

        return ProductVariantResource::make($variant);
    }

    public function destroy(ProductVariant $variant, DeleteVariant $deleteVariant): JsonResponse
    {
        $deleteVariant->execute($variant);

        return response()->json(status: 204);
    }
}
