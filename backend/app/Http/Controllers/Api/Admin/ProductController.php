<?php

namespace App\Http\Controllers\Api\Admin;

use App\Actions\Admin\Product\CreateProduct;
use App\Actions\Admin\Product\DeleteProduct;
use App\Actions\Admin\Product\UpdateProduct;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Product\ProductRequest;
use App\Http\Resources\Admin\ProductListResource;
use App\Http\Resources\Admin\ProductResource;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ProductController extends Controller
{
    /** GET /api/admin/products … 未公開含む。?q=名前検索 &category=slug &page= */
    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'q' => ['sometimes', 'string', 'max:120'],
            'category' => ['sometimes', 'string', 'exists:categories,slug'],
            'page' => ['sometimes', 'integer', 'min:1'],
        ]);

        $products = Product::query()
            ->with('category')
            ->withCount('variants')
            ->withSum('variants', 'stock')
            ->when(isset($filters['q']), fn ($q) => $q->where('name', 'ilike', '%'.$filters['q'].'%'))
            ->when(isset($filters['category']), fn ($q) => $q->inCategory($filters['category']))
            ->ordered()
            ->paginate(20);

        return ProductListResource::collection($products);
    }

    public function store(ProductRequest $request, CreateProduct $createProduct): JsonResponse
    {
        $product = $createProduct->execute($request->validated());

        return ProductResource::make($product)->response()->setStatusCode(201);
    }

    public function show(Product $product): ProductResource
    {
        return ProductResource::make($product->load([
            'images' => fn ($q) => $q->orderBy('position'),
            'variants' => fn ($q) => $q->orderBy('position'),
        ]));
    }

    public function update(ProductRequest $request, Product $product, UpdateProduct $updateProduct): ProductResource
    {
        return ProductResource::make($updateProduct->execute($product, $request->validated()));
    }

    public function destroy(Product $product, DeleteProduct $deleteProduct): JsonResponse
    {
        $deleteProduct->execute($product);

        return response()->json(status: 204);
    }
}
