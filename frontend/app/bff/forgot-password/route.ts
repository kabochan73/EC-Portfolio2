// ブラウザ → POST /bff/forgot-password → Laravel POST /api/forgot-password。
// Laravel は常に 200・中立メッセージ（アカウント存在を漏らさない）。

import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api";
import { sendPasswordReset } from "@/lib/auth";

export async function POST(request: Request) {
  const body = await request.json();

  try {
    const result = await sendPasswordReset(body);
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
