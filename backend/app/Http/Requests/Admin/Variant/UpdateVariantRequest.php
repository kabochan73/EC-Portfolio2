<?php

namespace App\Http\Requests\Admin\Variant;

use App\Models\ProductVariant;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * バリアントの更新（docs/05-admin.md）。size は変更不可（新規作成時のみ選択可）。
 */
class UpdateVariantRequest extends FormRequest
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
        /** @var ProductVariant $variant */
        $variant = $this->route('variant');

        return [
            'color' => ['nullable', 'string', 'max:30'],
            'sku' => [
                'required', 'string', 'max:40',
                Rule::unique('product_variants', 'sku')->ignore($variant->id),
            ],
            'stock' => ['required', 'integer', 'min:0'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            /** @var ProductVariant $variant */
            $variant = $this->route('variant');

            $exists = ProductVariant::query()
                ->where('product_id', $variant->product_id)
                ->where('size', $variant->size)
                ->whereKeyNot($variant->id)
                ->when(
                    $this->filled('color'),
                    fn ($q) => $q->where('color', $this->input('color')),
                    fn ($q) => $q->whereNull('color'),
                )
                ->exists();

            if ($exists) {
                $validator->errors()->add('color', 'このサイズ・色の組み合わせは既に登録されています。');
            }
        });
    }
}
