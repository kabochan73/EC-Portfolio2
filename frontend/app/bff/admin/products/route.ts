// ブラウザ → POST /bff/admin/products → Laravel /api/admin/products。
// 一覧の GET は作らない（一覧ページは Server Component が lib を直接呼ぶ）

import { NextResponse } from "next/server";

import { createProduct } from "@/lib/admin/products";
import { withSession } from "@/lib/bff";
import { revalidate, tags } from "@/lib/revalidate";

export async function POST(request: Request) {
  const body = await request.json();
  return withSession(async (token) => {
    const product = await createProduct(token, body);
    revalidate(tags.products, tags.categories);
    return NextResponse.json({ data: product }, { status: 201 });
  });
}
