// ─────────────────────────────────────────────────────────────
// カート明細の再検証（/cart・/checkout がクライアントから叩く）。
//   ブラウザ → GET /bff/cart/validate?ids=1,2,3 → Laravel GET /api/cart/validate
// 認証不要。ids は カンマ区切りの variant_id。
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";

import { validateCartLines } from "@/lib/cart";

export async function GET(request: Request) {
  const idsParam = new URL(request.url).searchParams.get("ids") ?? "";

  const variantIds = idsParam
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isInteger(value) && value > 0);

  const data = await validateCartLines(variantIds);

  return NextResponse.json({ data });
}
