<?php

use App\Http\Middleware\EnsureAdmin;
use App\Http\Middleware\ResolveBffClientIp;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // 管理 API（/api/admin/*）の認可（docs/05-admin.md）。routes で 'admin' と書けるようにする
        $middleware->alias(['admin' => EnsureAdmin::class]);

        // BFF 経由のリクエストの IP を実クライアントの IP にする（レート制限用）。
        // ルートの throttle より先に効かせるためグローバルに置く
        $middleware->append(ResolveBffClientIp::class);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
