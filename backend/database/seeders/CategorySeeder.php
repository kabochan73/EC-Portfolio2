<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    /**
     * 初期4カテゴリ（docs/02-database-design.md）。冪等（slug で updateOrCreate）。
     * admin のカテゴリ管理は「この4件を編集・並べ替え・5件目追加」で動作確認する。
     */
    public function run(): void
    {
        $categories = [
            ['slug' => 'tops', 'name' => 'Tops', 'position' => 0],
            ['slug' => 'bottoms', 'name' => 'Bottoms', 'position' => 1],
            ['slug' => 'outerwear', 'name' => 'Outerwear', 'position' => 2],
            ['slug' => 'accessories', 'name' => 'Accessories', 'position' => 3],
        ];

        foreach ($categories as $category) {
            Category::updateOrCreate(['slug' => $category['slug']], $category);
        }
    }
}
