<?php

namespace App\Actions\Auth;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\PersonalAccessToken;

/**
 * パスワード変更（docs/03-api.md PUT /api/me/password）。
 * 現パスワードの確認は UpdatePasswordRequest（current_password ルール）が行う。
 * 変更した端末のトークンだけ残し、他の端末のトークンは失効させる（盗まれたトークン対策）。
 */
final class UpdatePassword
{
    public function execute(User $user, string $newPassword): void
    {
        $user->password = Hash::make($newPassword);
        $user->save();

        $current = $user->currentAccessToken();
        $user->tokens()
            ->when($current instanceof PersonalAccessToken, fn ($q) => $q->whereKeyNot($current->getKey()))
            ->delete();
    }
}
