<?php

namespace App\Http\Requests\Admin\Content;

use Illuminate\Foundation\Http\FormRequest;

/**
 * CMS コンテンツの更新（docs/11-cms.md）。key ごとに rules を出し分ける。
 * key の妥当性（4種のいずれか）はルート側で担保（不正は 404）。
 */
class UpdateSiteContentRequest extends FormRequest
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
        return match ($this->route('key')) {
            'hero' => [
                'headline' => ['required', 'string', 'max:120'],
                'tagline' => ['required', 'string', 'max:200'],
                'image_url' => ['nullable', 'string', 'max:255'],
            ],
            'concept' => [
                'body' => ['required', 'string', 'max:2000'],
            ],
            'lookbook' => [
                'images' => ['present', 'array', 'max:12'],
                'images.*.url' => ['required', 'string', 'max:255'],
                'images.*.alt' => ['nullable', 'string', 'max:255'],
            ],
            'about' => [
                'blocks' => ['present', 'array', 'max:6'],
                'blocks.*.label' => ['required', 'string', 'max:60'],
                'blocks.*.heading' => ['required', 'string', 'max:120'],
                'blocks.*.body' => ['required', 'string', 'max:800'],
                'blocks.*.image_url' => ['nullable', 'string', 'max:255'],
            ],
            default => [],
        };
    }
}
