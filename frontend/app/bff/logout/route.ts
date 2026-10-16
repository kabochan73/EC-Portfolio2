// ブラウザ → POST /bff/logout → Laravel POST /api/logout（トークン失効）→ Cookie 削除

import { NextResponse } from "next/server";

import { clearSessionCookie, getSessionToken, logoutUser } from "@/lib/auth";

export async function POST() {
  const token = await getSessionToken();

  if (token) {
    // 既に無効等で失敗してもブラウザ Cookie は消したいので握りつぶす
    await logoutUser(token).catch(() => {});
  }

  const response = new NextResponse(null, { status: 204 });
  clearSessionCookie(response);
  return response;
}
