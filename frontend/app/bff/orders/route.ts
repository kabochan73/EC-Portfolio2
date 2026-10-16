// ブラウザ → POST /bff/orders → Laravel POST /api/orders（チェックアウトで pending 注文を作成）。
// 注文一覧の GET は無い（R4。一覧は /account/orders の Server Component が取る。R3 は使われない GET があった）。

import { NextResponse } from "next/server";

import { withSession } from "@/lib/bff";
import { createOrder } from "@/lib/orders";

export async function POST(request: Request) {
  const body = await request.json();

  return withSession(async (token) =>
    NextResponse.json({ data: await createOrder(token, body) }, { status: 201 }),
  );
}
