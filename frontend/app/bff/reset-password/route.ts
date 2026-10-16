// ブラウザ → POST /bff/reset-password → Laravel POST /api/reset-password。
// 失敗（無効/期限切れトークン・パスワード検証）は 422 をそのまま中継。

import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api";
import { resetPassword } from "@/lib/auth";

export async function POST(request: Request) {
  const body = await request.json();

  try {
    const result = await resetPassword(body);
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
