<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * BFF（Next.js）経由のリクエストで、$request->ip() を実クライアントの IP にする。
 *
 * ブラウザ → Next.js → Laravel と中継されるため、そのままでは ip() が Next.js サーバーの
 * IP になり、IP 単位のレート制限が「サイト全体で共有」になってしまう。
 * BFF は X-Client-IP に実 IP を、X-BFF-Secret に共有シークレットを付けて送る。
 * backend は公開ドメインからも直接叩けるので、シークレットが一致したときだけ信用する
 * （一致しなければヘッダーは無視し、通常どおり接続元の IP を使う）。
 */
class ResolveBffClientIp
{
    public function handle(Request $request, Closure $next): Response
    {
        $secret = (string) config('services.bff.secret');
        $clientIp = (string) $request->header('X-Client-IP');

        if ($secret !== ''
            && hash_equals($secret, (string) $request->header('X-BFF-Secret'))
            && filter_var($clientIp, FILTER_VALIDATE_IP) !== false) {
            $request->server->set('REMOTE_ADDR', $clientIp);
        }

        return $next($request);
    }
}
