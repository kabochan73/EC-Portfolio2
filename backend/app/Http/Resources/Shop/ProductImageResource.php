<?php

namespace App\Http\Resources\Shop;

use App\Models\ProductImage;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * 商品画像（公開・管理共用）。url は /media プロキシ経由の相対パス（docs/05-admin.md）。
 *
 * @mixin ProductImage
 */
class ProductImageResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'url' => $this->url(),
            'alt' => $this->alt,
            'position' => $this->position,
        ];
    }
}
