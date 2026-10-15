<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * 開発・レビュー用カタログ（docs/00 の商品構成）。
 * 画像はユーザー提供。ここでは商品 + バリアントのみ作る（画像なし = フロントは NO IMAGE）。
 * CategorySeeder が先に必要。冪等（slug で updateOrCreate、バリアントは sku で）。
 */
class ProductSeeder extends Seeder
{
    private const TOPS_CHART = [
        'unit' => 'cm',
        'columns' => ['着丈', '身幅', '肩幅', '袖丈'],
        'rows' => ['S' => [66, 52, 46, 20], 'M' => [68, 55, 48, 21], 'L' => [70, 58, 50, 22]],
    ];

    private const BOTTOMS_CHART = [
        'unit' => 'cm',
        'columns' => ['ウエスト', '股上', '股下', 'わたり幅', '裾幅'],
        'rows' => ['S' => [72, 27, 68, 30, 18], 'M' => [76, 28, 70, 31, 19], 'L' => [80, 29, 72, 32, 20]],
    ];

    private const OUTER_CHART = [
        'unit' => 'cm',
        'columns' => ['着丈', '身幅', '肩幅', '袖丈'],
        'rows' => ['S' => [70, 56, 44, 60], 'M' => [73, 59, 46, 62], 'L' => [76, 62, 48, 64]],
    ];

    public function run(): void
    {
        $catalog = [
            'tops' => [
                ['Boxy Cotton T-Shirt', 12000, self::TOPS_CHART, ['Black', 'Ecru']],
                ['Heavyweight Long Sleeve', 16000, self::TOPS_CHART, null],
                ['Ribbed Knit Polo', 21000, self::TOPS_CHART, null],
                ['Oversized Oxford Shirt', 24000, self::TOPS_CHART, ['White', 'Sax']],
            ],
            'bottoms' => [
                ['Wide Tailored Trousers', 28000, self::BOTTOMS_CHART, null],
                ['Relaxed Denim', 26000, self::BOTTOMS_CHART, null],
                ['Drawstring Shorts', 15000, self::BOTTOMS_CHART, ['Black', 'Olive']],
                ['Pleated Chino', 23000, self::BOTTOMS_CHART, ['Beige', 'Charcoal']],
            ],
            'outerwear' => [
                ['Unlined Chore Jacket', 38000, self::OUTER_CHART, null],
                ['Wool Balmacaan Coat', 72000, self::OUTER_CHART, null],
                ['Recycled Nylon Shell', 32000, self::OUTER_CHART, ['Black', 'Steel']],
                ['Cotton Field Jacket', 36000, self::OUTER_CHART, null],
            ],
            'accessories' => [
                ['Ribbed Wool Beanie', 9000, null, ['Black', 'Grey', 'Camel']],
                ['Leather Card Holder', 14000, null, null],
                ['Cotton Bucket Hat', 11000, null, null],
                ['Canvas Tote', 13000, null, null],
            ],
        ];

        $position = 0;

        foreach ($catalog as $categorySlug => $products) {
            $category = Category::where('slug', $categorySlug)->firstOrFail();
            $isAccessory = $categorySlug === 'accessories';

            foreach ($products as [$name, $price, $chart, $colors]) {
                $product = Product::updateOrCreate(
                    ['slug' => Str::slug($name)],
                    [
                        'category_id' => $category->id,
                        'name' => $name,
                        'price' => $price,
                        'description' => "{$name}。無駄をそぎ落とした毎日の定番。ユニセックスで着られるゆったりとしたシルエット。",
                        'material' => $isAccessory ? '表地 綿100%' : '本体 綿100%',
                        'care' => $isAccessory ? null : '洗濯機可（ネット使用）・タンブラー乾燥不可',
                        'origin' => '日本',
                        'product_code' => 'EC-'.strtoupper(substr($categorySlug, 0, 2)).str_pad((string) (++$position), 4, '0', STR_PAD_LEFT),
                        'size_chart' => $chart,
                        'is_published' => true,
                        'position' => $position,
                    ],
                );

                $this->seedVariants($product, $isAccessory, $colors);
            }
        }
    }

    /**
     * @param  list<string>|null  $colors
     */
    private function seedVariants(Product $product, bool $isAccessory, ?array $colors): void
    {
        $sizes = $isAccessory ? ['FREE'] : ['S', 'M', 'L'];
        $colorOptions = $colors ?? [null];
        $index = 0;

        foreach ($colorOptions as $color) {
            foreach ($sizes as $sizeIndex => $size) {
                $skuColor = $color ? strtoupper(substr($color, 0, 3)) : 'STD';
                $product->variants()->updateOrCreate(
                    ['sku' => "{$product->product_code}-{$skuColor}-{$size}"],
                    [
                        'size' => $size,
                        'color' => $color,
                        'stock' => [12, 4, 0, 8, 20][$index % 5],
                        'position' => $sizeIndex,
                    ],
                );
                $index++;
            }
        }
    }
}
