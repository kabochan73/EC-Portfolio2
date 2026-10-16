<?php

namespace App\Http\Requests\Admin\ProductImage;

use Illuminate\Foundation\Http\FormRequest;

class StoreProductImageRequest extends FormRequest
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
            'image' => ['required', 'image', 'max:5120'], // 5MB
            'alt' => ['nullable', 'string', 'max:255'],
        ];
    }
}
