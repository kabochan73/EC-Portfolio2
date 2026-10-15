<?php

namespace App\Http\Resources\Shop;

use App\Enums\StockStatus;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * 商品カード用の要約（docs/03-api.md GET /api/products / related）。
 * 公開 API なので生の在庫数は返さず、全 variant 合算のステータスのみ。
 *
 * @mixin Product
 */
class ProductSummaryResource extends JsonResource
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
            'stock_status' => StockStatus::fromStock($this->totalStock())->value,
            'is_new' => $this->isNew(),
            'images' => ProductImageResource::collection($this->images),
        ];
    }
}
