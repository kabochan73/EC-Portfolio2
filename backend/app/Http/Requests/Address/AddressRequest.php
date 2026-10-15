<?php

namespace App\Http\Requests\Address;

use Illuminate\Foundation\Http\FormRequest;

/**
 * 住所の作成（POST）と更新（PUT）で共用。ルールが完全に同じなので 1 つにまとめた
 * （R4。R3 は Store / Update で中身が同一のファイルを 2 つ持っていた）。
 * PUT は「全項目を送って置き換える」前提なので、更新でも required のままでよい。
 * 将来ルールが分かれたら、そのとき Store / Update に分ける（docs/06 §0「予測で作らない」）。
 */
class AddressRequest extends FormRequest
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
            'recipient_name' => ['required', 'string', 'max:100'],
            'postal_code' => ['required', 'string', 'regex:/^\d{3}-\d{4}$/'],
            'prefecture' => ['required', 'string', 'max:10'],
            'city' => ['required', 'string', 'max:100'],
            'address_line1' => ['required', 'string', 'max:255'],
            'address_line2' => ['nullable', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:20'],
            'is_default' => ['sometimes', 'boolean'],
        ];
    }
}
