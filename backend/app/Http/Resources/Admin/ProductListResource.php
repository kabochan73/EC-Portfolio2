<?php

namespace App\Http\Resources\Admin;

use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * 管理向け商品一覧の1行（docs/05-admin.md）。
 * 公開用と違い is_published に関わらず全件対象、在庫合計を見せる。
 *
 * @mixin Product
 */
class ProductListResource extends JsonResource
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
                'id' => $this->category->id,
                'name' => $this->category->name,
                'slug' => $this->category->slug,
            ],
            'is_published' => $this->is_published,
            'position' => $this->position,
            // コントローラが withSum / withCount 済み（null は変数なし = 0 とみなす）
            'total_stock' => (int) ($this->variants_sum_stock ?? 0),
            'variant_count' => (int) ($this->variants_count ?? 0),
        ];
    }
}
