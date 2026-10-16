<?php

namespace App\Http\Resources\Admin;

use App\Models\ProductVariant;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * 管理向けバリアント（編集フォーム用。docs/05-admin.md）。
 * 公開用と違い生の stock / sku を返す。
 *
 * @mixin ProductVariant
 */
class ProductVariantResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'size' => $this->size,
            'color' => $this->color,
            'sku' => $this->sku,
            'stock' => $this->stock,
            'position' => $this->position,
        ];
    }
}
