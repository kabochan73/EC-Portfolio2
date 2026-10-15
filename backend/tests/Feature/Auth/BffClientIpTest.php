<?php

// ResolveBffClientIp（app/Http/Middleware）。
// BFF 構成では Laravel から見た接続元が全員 Next.js になるので、BFF が X-Client-IP で
// 実クライアントの IP を渡す。共有シークレット（X-BFF-Secret）が一致したときだけ信用する。
// 会員登録のレート制限（IP で 5 回/分）を使って確かめる。

function registerFrom(string $ip, string $secret, int $n)
{
    return test()->postJson('/api/register', [
        'name' => "User {$n}",
        'email' => "user{$n}@example.com",
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ], ['X-Client-IP' => $ip, 'X-BFF-Secret' => $secret]);
}

it('rate-limits by the client IP forwarded by the BFF, not the BFF itself', function () {
    foreach (range(1, 5) as $n) {
        registerFrom('203.0.113.1', 'bff_test_secret', $n)->assertCreated();
    }
    registerFrom('203.0.113.1', 'bff_test_secret', 6)->assertStatus(429);

    // 別のクライアントは、BFF（接続元）が同じでも制限されない
    registerFrom('203.0.113.2', 'bff_test_secret', 7)->assertCreated();
});

it('ignores a forwarded client IP without the shared secret', function () {
    // シークレットが違えば X-Client-IP は無視され、接続元 IP（テストでは 127.0.0.1）で数えられる
    foreach (range(1, 5) as $n) {
        registerFrom("203.0.113.{$n}", 'wrong', $n)->assertCreated();
    }

    // IP を毎回偽っても、6 回目は制限される
    registerFrom('203.0.113.99', 'wrong', 6)->assertStatus(429);
});
