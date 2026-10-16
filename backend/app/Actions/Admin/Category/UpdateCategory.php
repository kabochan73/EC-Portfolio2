<?php

namespace App\Actions\Admin\Category;

use App\Models\Category;

final class UpdateCategory
{
    /**
     * @param  array{name: string, slug: string}  $data
     */
    public function execute(Category $category, array $data): Category
    {
        $category->update([
            'name' => $data['name'],
            'slug' => $data['slug'],
        ]);

        return $category;
    }
}
