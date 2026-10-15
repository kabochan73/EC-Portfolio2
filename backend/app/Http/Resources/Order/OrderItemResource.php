<?php

namespace App\Http\Resources\Order;

use App\Models\OrderItem;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * 注文明細1行（スナップショット。docs/03-api.md）。
 *
 * @mixin OrderItem
 */
class OrderItemResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'product_name' => $this->product_name,
            'product_slug' => $this->whenLoaded('product', fn () => $this->product?->slug),
            'size' => $this->variant_size,
            'color' => $this->variant_color,
            'image_url' => $this->image_url !== '' ? $this->image_url : null,
            'unit_price' => $this->unit_price,
            'quantity' => $this->quantity,
            'line_total' => $this->line_total,
        ];
    }
}
