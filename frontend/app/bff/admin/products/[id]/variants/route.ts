// ブラウザ → POST /bff/admin/products/{id}/variants → Laravel の同じパス。

import { NextResponse } from "next/server";

import { revalidateProductCaches } from "@/lib/admin/products";
import { createVariant } from "@/lib/admin/variants";
import { withSession } from "@/lib/bff";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  const { id } = await params;
  const body = await request.json();
  return withSession(async (token) => {
    const variant = await createVariant(token, Number(id), body);
    await revalidateProductCaches(token, Number(id));
    return NextResponse.json({ data: variant }, { status: 201 });
  });
}
