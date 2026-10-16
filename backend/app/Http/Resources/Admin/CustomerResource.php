<?php

namespace App\Http\Resources\Admin;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * 管理向け会員一覧の1行（docs/05-admin.md）。閲覧のみ。
 *
 * @mixin User
 */
class CustomerResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'orders_count' => (int) ($this->orders_count ?? 0),
            'joined_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
