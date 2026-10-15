<?php

namespace App\Providers;

use Illuminate\Database\Eloquent\Model;
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

        // Stripe クライアントの登録とレート制限（login / register / orders 等）は、
        // それぞれの機能を作る Step で足す（R3 の最終形は ../EC-Portfolio を参照）。
    }
}
