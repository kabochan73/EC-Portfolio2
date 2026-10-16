<?php

namespace App\Http\Resources\Admin;

use App\Http\Resources\Order\OrderResource as CustomerOrderResource;
use App\Models\Order;
use Illuminate\Http\Request;

/**
 * 管理向け注文詳細（docs/05-admin.md）。
 * 利用者向けの注文詳細（Order\OrderResource）に、顧客の情報と詳しい決済情報を足したもの。
 * 継承して差分だけ書く（R4。R3 は配送先・金額などを 2 ファイルに同じように書いていた）
 *
 * @mixin Order
 */
class OrderResource extends CustomerOrderResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            ...parent::toArray($request),
            'customer' => [
                'id' => $this->user?->id,
                'name' => $this->user?->name,
                'email' => $this->user?->email,
            ],
            // 利用者向けの payment（status / last_error）を、管理用の詳しい形で上書きする
            'payment' => $this->whenLoaded('payment', fn () => $this->payment ? [
                'status' => $this->payment->status,
                'stripe_payment_intent_id' => $this->payment->stripe_payment_intent_id,
                'last_error' => $this->payment->last_error,
                'refunded_at' => $this->payment->refunded_at?->toIso8601String(),
            ] : null),
        ];
    }
}
