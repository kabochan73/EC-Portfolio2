<?php

namespace App\Http\Resources\Admin;

use App\Http\Resources\Shop\ProductImageResource;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * 管理向け商品詳細（編集フォーム用。docs/05-admin.md）。
 * 生の値をそのまま返す（category_id など）。images / variants を含む。
 *
 * @mixin Product
 */
class ProductResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'category_id' => $this->category_id,
            'name' => $this->name,
            'slug' => $this->slug,
            'price' => $this->price,
            'description' => $this->description,
            'material' => $this->material,
            'care' => $this->care,
            'origin' => $this->origin,
            'product_code' => $this->product_code,
            'size_chart' => $this->size_chart,
            'is_published' => $this->is_published,
            'position' => $this->position,
            'created_at' => $this->created_at?->toIso8601String(),
            'images' => ProductImageResource::collection($this->whenLoaded('images')),
            'variants' => ProductVariantResource::collection($this->whenLoaded('variants')),
        ];
    }
}
