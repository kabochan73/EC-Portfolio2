<?php

namespace App\Actions\Auth;

use App\Models\User;

/**
 * 氏名・メールの更新（docs/03-api.md PUT /api/me）。
 */
final class UpdateProfile
{
    public function execute(User $user, string $name, string $email): User
    {
        $user->name = $name;
        $user->email = $email;
        $user->save();

        return $user;
    }
}
