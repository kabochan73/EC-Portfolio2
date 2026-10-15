<?php

namespace App\Actions\Auth;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

/**
 * メール＋パスワードでの認証（docs/03-api.md POST /api/login）。
 * 失敗は 422（ValidationException）で email フィールドにメッセージを付ける。
 *
 * 「メールが無い」と「パスワード違い」を区別させない:
 *  - メッセージは同じ
 *  - 応答時間も揃える。ユーザーが居なくてもダミーのハッシュに対して Hash::check を実行する
 *    （bcrypt の照合は意図的に遅いので、飛ばすと速く返り「未登録」だと推測できてしまう。
 *     R3 はコメントでそう謳いながら、ユーザー不在時に照合を飛ばしていた。R4 で修正）
 */
final class AuthenticateUser
{
    /** どのパスワードとも一致しない bcrypt ハッシュ（cost 12 = 本番の BCRYPT_ROUNDS と同じ重さ） */
    private const DUMMY_HASH = '$2y$12$TtOEESKSCKfjD5E4DVbgy.YFdJkD5Y02yti22CQOi1BgP8lJ2f/1.';

    public function execute(string $email, string $password): User
    {
        $user = User::where('email', $email)->first();

        $passwordMatches = Hash::check($password, $user?->password ?? self::DUMMY_HASH);

        if ($user === null || ! $passwordMatches) {
            throw ValidationException::withMessages([
                'email' => [__('auth.failed')],
            ]);
        }

        return $user;
    }
}
