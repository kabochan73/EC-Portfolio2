// 要ログインページのガード。Cookie の有無だけを見る軽量チェック
// （トークンの有効性は各 Server Component の requireAuth / Route Handler が Laravel 呼び出し時に検証。docs/08 §4）。
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { SESSION_COOKIE_NAME } from "@/lib/constants";

export function middleware(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    // 戻り先は ? 以降も含める（R4）。R3 は pathname だけで、/checkout/payment?order=EC-... から
    // ログインし直すと ?order が落ち、どの注文の決済だったか分からなくなっていた
    loginUrl.searchParams.set("redirect", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// /admin は role=admin の確認も要るが、ここは Cookie 有無だけ。
// 実際の権限確認は requireAdmin()（Server Component 側）で行う（docs/05-admin.md）。
export const config = {
  matcher: ["/checkout/:path*", "/account/:path*", "/admin/:path*"],
};
