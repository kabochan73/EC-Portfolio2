<?php

namespace App\Http\Resources\Order;

use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * 注文詳細（docs/03-api.md GET /api/orders/{order_number} / POST /api/orders）。
 *
 * @mixin Order
 */
class OrderResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'order_number' => $this->order_number,
            'status' => $this->status->value,
            'subtotal' => $this->subtotal,
            'shipping_fee' => $this->shipping_fee,
            'total' => $this->total,
            'placed_at' => $this->created_at?->toIso8601String(),
            'paid_at' => $this->paid_at?->toIso8601String(),
            'shipped_at' => $this->shipped_at?->toIso8601String(),
            'cancelled_at' => $this->cancelled_at?->toIso8601String(),
            'shipping_address' => [
                'recipient_name' => $this->ship_recipient_name,
                'postal_code' => $this->ship_postal_code,
                'prefecture' => $this->ship_prefecture,
                'city' => $this->ship_city,
                'address_line1' => $this->ship_address_line1,
                'address_line2' => $this->ship_address_line2,
                'phone' => $this->ship_phone,
            ],
            'items' => OrderItemResource::collection($this->whenLoaded('items')),
            'payment' => $this->whenLoaded('payment', fn () => [
                'status' => $this->payment?->status,
                'last_error' => $this->payment?->last_error,
            ]),
        ];
    }
}
