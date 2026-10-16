// ブラウザ → POST /bff/login → Laravel POST /api/login。実処理は lib/auth.ts。

import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api";
import { loginUser, setSessionCookie } from "@/lib/auth";

export async function POST(request: Request) {
  const body = await request.json();

  try {
    const { user, token } = await loginUser(body);
    // token はブラウザに渡さず Cookie にだけ入れる
    const response = NextResponse.json({ data: user });
    setSessionCookie(response, token);
    return response;
  } catch (error) {
    return apiErrorResponse(error);
  }
}
