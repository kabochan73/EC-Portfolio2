<?php

namespace App\Http\Controllers\Api\Admin;

use App\Actions\Admin\Category\CreateCategory;
use App\Actions\Admin\Category\DeleteCategory;
use App\Actions\Admin\Category\ReorderCategories;
use App\Actions\Admin\Category\UpdateCategory;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Category\CategoryRequest;
use App\Http\Requests\Admin\Category\ReorderCategoriesRequest;
use App\Http\Resources\Admin\CategoryResource;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CategoryController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        return CategoryResource::collection(
            Category::withCount('products')->ordered()->get(),
        );
    }

    public function store(CategoryRequest $request, CreateCategory $createCategory): JsonResponse
    {
        $category = $createCategory->execute($request->validated());

        return CategoryResource::make($category->loadCount('products'))->response()->setStatusCode(201);
    }

    public function update(CategoryRequest $request, Category $category, UpdateCategory $updateCategory): CategoryResource
    {
        $updateCategory->execute($category, $request->validated());

        return CategoryResource::make($category->loadCount('products'));
    }

    public function destroy(Category $category, DeleteCategory $deleteCategory): JsonResponse
    {
        $deleteCategory->execute($category);

        return response()->json(status: 204);
    }

    public function reorder(ReorderCategoriesRequest $request, ReorderCategories $reorderCategories): AnonymousResourceCollection
    {
        $reorderCategories->execute(array_map('intval', $request->validated('order')));

        return CategoryResource::collection(Category::withCount('products')->ordered()->get());
    }
}
