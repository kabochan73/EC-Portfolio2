<?php

namespace App\Http\Requests\Admin\Product;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * 商品の作成（POST）と更新（PUT）で共用（R4。R3 は Store / Update の 2 ファイルで、
 * 違いは slug の unique で自分自身を除外するかだけだった。CategoryRequest と同じ形）
 */
class ProductRequest extends FormRequest
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
            'category_id' => ['required', 'integer', 'exists:categories,id'],
            'name' => ['required', 'string', 'max:120'],
            'slug' => [
                'required', 'string', 'max:140', 'alpha_dash',
                Rule::unique('products', 'slug')->ignore($this->route('product')),
            ],
            'price' => ['required', 'integer', 'min:1'],
            'description' => ['required', 'string'],
            'material' => ['required', 'string'],
            'care' => ['nullable', 'string'],
            'origin' => ['required', 'string', 'max:50'],
            'product_code' => ['required', 'string', 'max:30'],
            'size_chart' => ['nullable', 'array'],
            'size_chart.unit' => ['required_with:size_chart', 'string', 'max:10'],
            'size_chart.columns' => ['required_with:size_chart', 'array', 'min:1'],
            'size_chart.columns.*' => ['string', 'max:20'],
            'size_chart.rows' => ['required_with:size_chart', 'array', 'min:1'],
            'is_published' => ['required', 'boolean'],
            'position' => ['sometimes', 'integer', 'min:0'],
        ];
    }
}
