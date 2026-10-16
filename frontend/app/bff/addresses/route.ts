// ブラウザ → POST /bff/addresses → Laravel POST /api/addresses（本人の住所として作成）。
// 一覧の GET は無い（R4）。一覧は /account/addresses の Server Component が取り、
// 操作の後は router.refresh() で描き直す（docs/08 §3.6）。

import { NextResponse } from "next/server";

import { createAddress } from "@/lib/addresses";
import { withSession } from "@/lib/bff";

export async function POST(request: Request) {
  const body = await request.json();

  return withSession(async (token) =>
    NextResponse.json({ data: await createAddress(token, body) }, { status: 201 }),
  );
}
