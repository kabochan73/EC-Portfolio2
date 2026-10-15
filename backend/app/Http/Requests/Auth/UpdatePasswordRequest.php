<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class UpdatePasswordRequest extends FormRequest
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
            // current_password … 認証済みユーザーの現在のパスワードと一致するか
            'current_password' => ['required', 'string', 'current_password'],
            'password' => ['required', 'confirmed', 'different:current_password', Password::min(8)],
        ];
    }
}
