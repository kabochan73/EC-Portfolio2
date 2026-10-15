<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // 本番以外では N+1（遅延ロード）を即例外にして開発中に気づけるようにする。
        // 注意（R2 の発見）: preventLazyLoading は複数行結果にしか効かない。
        // 単一モデルの遅延アクセスはすり抜けるので、詳細ページの with は手を抜かない。
        $isProduction = $this->app->environment('production');
        Model::preventLazyLoading(! $isProduction);
        // fillable に無い属性を渡したとき、黙って捨てずに例外にする（打ち間違いに気づける）
        Model::preventSilentlyDiscardingAttributes(! $isProduction);

        // ログイン試行のレート制限（メール + IP で 5 回/分）。routes で throttle:login。
        // メールも鍵に入れるので、同じ IP から別アカウントを試すのは別枠（総当たりは 1 アカウントずつ抑える）
        RateLimiter::for('login', function (Request $request) {
            $email = (string) $request->input('email');

            return Limit::perMinute(5)->by(mb_strtolower($email).'|'.$request->ip());
        });

        // 会員登録（IP で 5 回/分）。IP は BFF が渡す実クライアント IP（ResolveBffClientIp。Step 13c）
        RateLimiter::for('register', fn (Request $request) => Limit::perMinute(5)->by($request->ip()));

        // パスワードリセットの送信・実行（IP で 6 回/分）。メール爆撃とトークン総当たりを抑える
        RateLimiter::for('password-reset', fn (Request $request) => Limit::perMinute(6)->by($request->ip()));

        // 注文作成（ユーザーごとに 5 回/分）。在庫の確保を連打で繰り返させない
        RateLimiter::for('orders', fn (Request $request) => Limit::perMinute(5)->by((string) $request->user()?->id));

        // Stripe クライアントの登録は決済の Step（Step 20）で足す
    }
}
