// ブラウザ → PUT/DELETE /bff/admin/variants/{id}?product={productId} → Laravel /api/admin/variants/{id}。
// 画像の削除と同じく、キャッシュを消すための商品 id を ?product= で受け取る

import { NextResponse } from "next/server";

import { revalidateProductCaches } from "@/lib/admin/products";
import { deleteVariant, updateVariant } from "@/lib/admin/variants";
import { noContent, withSession } from "@/lib/bff";
import { revalidate, tags } from "@/lib/revalidate";

type Context = { params: Promise<{ id: string }> };

/** 商品ページ（在庫の表示）のキャッシュを消す。商品 id が無ければ一覧だけ */
async function revalidateFor(request: Request, token: string): Promise<void> {
  const productId = Number(new URL(request.url).searchParams.get("product"));
  if (productId) await revalidateProductCaches(token, productId);
  else revalidate(tags.products);
}

export async function PUT(request: Request, { params }: Context) {
  const { id } = await params;
  const body = await request.json();
  return withSession(async (token) => {
    const variant = await updateVariant(token, Number(id), body);
    await revalidateFor(request, token);
    return NextResponse.json({ data: variant });
  });
}

export async function DELETE(request: Request, { params }: Context) {
  const { id } = await params;
  return withSession(async (token) => {
    await deleteVariant(token, Number(id));
    await revalidateFor(request, token);
    return noContent();
  });
}
