// ─────────────────────────────────────────────────────────────
// ログインが必要な BFF Route Handler の共通処理（R4 で新設）。
//   Cookie のトークンを読む → 無ければ 401 → handler を呼ぶ → Laravel のエラー（ApiError）は
//   同じステータス・同じ形でブラウザに中継する（docs/08 §3.5）
// R3 は、この 10 行ほどを、ログインが必要な BFF のファイルすべてに書いていた。
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api";
import { getSessionToken } from "@/lib/auth";

export async function withSession(handler: (token: string) => Promise<Response>): Promise<Response> {
  const token = await getSessionToken();

  if (!token) {
    return NextResponse.json({ message: "Unauthenticated." }, { status: 401 });
  }

  try {
    return await handler(token);
  } catch (error) {
    return apiErrorResponse(error);
  }
}

/** 204 No Content（削除など、返す本文が無い成功） */
export function noContent(): Response {
  return new NextResponse(null, { status: 204 });
}
