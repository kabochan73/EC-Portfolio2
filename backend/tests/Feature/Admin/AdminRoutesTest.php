<?php

use Illuminate\Support\Facades\Route;

// 管理 API の認可の「付け忘れ」を構造で防ぐテスト（R4 追加）。
// /api/admin/* のルートが 1 本でも auth:sanctum + admin を通らずに登録されていたら落ちる。
// 個々の機能のテストで 401 / 403 を書き忘れても、ここで必ず気づける

it('protects every admin route with auth:sanctum and the admin middleware', function () {
    $adminRoutes = collect(Route::getRoutes()->getRoutes())
        ->filter(fn ($route) => str_starts_with($route->uri(), 'api/admin'));

    foreach ($adminRoutes as $route) {
        expect($route->gatherMiddleware())
            ->toContain('auth:sanctum', 'admin');
    }
})->skip(fn () => collect(Route::getRoutes()->getRoutes())
    ->filter(fn ($route) => str_starts_with($route->uri(), 'api/admin'))
    ->isEmpty(), 'まだ管理ルートが無い（Step 23b で追加）');
