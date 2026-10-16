// ブラウザ → POST /bff/register → Laravel POST /api/register。実処理は lib/auth.ts。

import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api";
import { registerUser, setSessionCookie } from "@/lib/auth";

export async function POST(request: Request) {
  const body = await request.json();

  try {
    const { user, token } = await registerUser(body);
    // 登録直後にログイン状態にする（メール認証は実装しない。docs/01）
    const response = NextResponse.json({ data: user }, { status: 201 });
    setSessionCookie(response, token);
    return response;
  } catch (error) {
    return apiErrorResponse(error);
  }
}
