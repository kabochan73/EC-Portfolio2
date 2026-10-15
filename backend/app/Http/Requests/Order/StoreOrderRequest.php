<?php

namespace App\Http\Requests\Order;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreOrderRequest extends FormRequest
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
        $max = (int) config('shop.cart_max_quantity_per_line');

        return [
            'items' => ['required', 'array', 'min:1'],
            'items.*.variant_id' => ['required', 'integer', 'distinct', 'exists:product_variants,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1', "max:{$max}"],

            'address_id' => [
                'required_without:address', 'nullable', 'integer',
                Rule::exists('addresses', 'id')->where('user_id', $this->user()->id),
            ],
            'address' => ['required_without:address_id', 'nullable', 'array'],
            'address.recipient_name' => ['required_with:address', 'string', 'max:100'],
            'address.postal_code' => ['required_with:address', 'string', 'regex:/^\d{3}-\d{4}$/'],
            'address.prefecture' => ['required_with:address', 'string', 'max:10'],
            'address.city' => ['required_with:address', 'string', 'max:100'],
            'address.address_line1' => ['required_with:address', 'string', 'max:255'],
            'address.address_line2' => ['nullable', 'string', 'max:255'],
            'address.phone' => ['required_with:address', 'string', 'max:20'],

            'save_address' => ['sometimes', 'boolean'],
        ];
    }
}
