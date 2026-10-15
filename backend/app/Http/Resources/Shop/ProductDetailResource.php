<?php

namespace App\Http\Resources\Shop;

use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * 商品詳細（docs/03-api.md GET /api/products/{slug}）。
 *
 * related は同カテゴリの他の公開商品を position 順に全件（件数上限なし）。
 * コントローラ側で $this->resource->setRelation('relatedProducts', ...) しておく。
 *
 * @mixin Product
 */
class ProductDetailResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'price' => $this->price,
            'category' => [
                'name' => $this->category->name,
                'slug' => $this->category->slug,
            ],
            'description' => $this->description,
            'material' => $this->material,
            'care' => $this->care,
            'origin' => $this->origin,
            'product_code' => $this->product_code,
            'size_chart' => $this->size_chart,
            'is_new' => $this->isNew(),
            'images' => ProductImageResource::collection($this->images),
            'colors' => $this->variants
                ->pluck('color')
                ->filter()
                ->unique()
                ->values(),
            'variants' => ProductVariantResource::collection($this->variants),
            'related' => ProductSummaryResource::collection($this->relatedProducts),
        ];
    }
}
