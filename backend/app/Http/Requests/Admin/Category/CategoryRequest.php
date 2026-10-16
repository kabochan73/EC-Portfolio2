<?php

namespace App\Http\Requests\Admin\Category;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * カテゴリの作成（POST）と更新（PUT）で共用（R4。R3 は Store / Update の 2 ファイルで、
 * 違いは slug の unique で「自分自身を除外するか」だけだった）。
 * 作成時はルートに {category} が無いので ignore(null) = 何も除外しない、になる
 */
class CategoryRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:50'],
            'slug' => [
                'required', 'string', 'max:50', 'alpha_dash',
                Rule::unique('categories', 'slug')->ignore($this->route('category')),
            ],
        ];
    }
}
