// ブラウザ → GET /bff/orders/{number} → Laravel GET /api/orders/{number}（本人の注文）。
// /checkout/complete のポーリング専用（Webhook で paid になったかを確かめる）。
// 「ブラウザから定期的に取り直す」ので CC から読む例外（docs/08 §3.6 の理由 ③）。

import { NextResponse } from "next/server";

import { withSession } from "@/lib/bff";
import { getMyOrder } from "@/lib/orders";

type Ctx = { params: Promise<{ number: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const { number } = await params;

  return withSession(async (token) => {
    const order = await getMyOrder(token, number);

    return order
      ? NextResponse.json({ data: order })
      : NextResponse.json({ message: "Order not found." }, { status: 404 });
  });
}
