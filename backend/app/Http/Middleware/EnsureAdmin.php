<?php

namespace App\Http\Middleware;

use App\Enums\UserRole;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * 管理 API（/api/admin/*）の認可（docs/05-admin.md）。
 * 認証済みだが admin ロールでない場合は 403（存在を隠す 404 ではなく素直に 403）。
 */
class EnsureAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        abort_unless($request->user()?->role === UserRole::Admin, 403);

        return $next($request);
    }
}
