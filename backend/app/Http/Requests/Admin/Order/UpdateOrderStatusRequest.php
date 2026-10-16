<?php

namespace App\Http\Requests\Admin\Order;

use App\Enums\OrderStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * admin が変更できるのは shipped / completed / cancelled のみ。
 * pending → paid は Stripe Webhook が行う（docs/02 の state machine）。
 */
class UpdateOrderStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'status' => [
                'required',
                Rule::enum(OrderStatus::class),
                Rule::in([OrderStatus::Shipped->value, OrderStatus::Completed->value, OrderStatus::Cancelled->value]),
            ],
        ];
    }
}
