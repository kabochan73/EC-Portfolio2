<?php

namespace App\Actions\Admin\Category;

use App\Exceptions\CategoryInUseException;
use App\Models\Category;

final class DeleteCategory
{
    public function execute(Category $category): void
    {
        $productCount = $category->products()->count();

        if ($productCount > 0) {
            throw new CategoryInUseException($productCount);
        }

        $category->delete();
    }
}
