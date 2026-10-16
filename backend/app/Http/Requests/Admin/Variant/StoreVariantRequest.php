<?php

namespace App\Http\Requests\Admin\Variant;

use App\Models\ProductVariant;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

class StoreVariantRequest extends FormRequest
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
            'size' => ['required', 'string', 'in:S,M,L,FREE'],
            'color' => ['nullable', 'string', 'max:30'],
            'sku' => ['required', 'string', 'max:40', 'unique:product_variants,sku'],
            'stock' => ['required', 'integer', 'min:0'],
        ];
    }

    /**
     * size + color の複合ユニーク（部分 UNIQUE インデックスと同条件）を
     * 事前チェックしてフォーム向けの 422 にする（DB 例外にしない）。
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $product = $this->route('product');

            $exists = ProductVariant::query()
                ->where('product_id', $product->id)
                ->where('size', $this->input('size'))
                ->when(
                    $this->filled('color'),
                    fn ($q) => $q->where('color', $this->input('color')),
                    fn ($q) => $q->whereNull('color'),
                )
                ->exists();

            if ($exists) {
                $validator->errors()->add('size', 'このサイズ・色の組み合わせは既に登録されています。');
            }
        });
    }
}
