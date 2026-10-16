<?php

namespace App\Actions\Admin\Category;

use App\Models\Category;

final class CreateCategory
{
    /**
     * @param  array{name: string, slug: string}  $data
     */
    public function execute(array $data): Category
    {
        return Category::create([
            'name' => $data['name'],
            'slug' => $data['slug'],
            'position' => (int) (Category::max('position') ?? -1) + 1,
        ]);
    }
}
