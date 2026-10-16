// ブラウザ → PUT/DELETE /bff/admin/products/{id} → Laravel /api/admin/products/{id}。
// R4: GET は作らない（R3 は画像・バリアントの部品が取り直すのに使っていた。R4 は router.refresh()）

import { NextResponse } from "next/server";

import { deleteProduct, fetchAdminProduct, updateProduct } from "@/lib/admin/products";
import { noContent, withSession } from "@/lib/bff";
import { revalidate, tags } from "@/lib/revalidate";

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Context) {
  const { id } = await params;
  const body = await request.json();
  return withSession(async (token) => {
    // R4: 変更前の slug も控える。slug を変えたとき、古い URL の商品ページのキャッシュも消すため
    const before = await fetchAdminProduct(token, Number(id));
    const product = await updateProduct(token, Number(id), body);
    revalidate(tags.products, tags.categories, tags.product(before.slug), tags.product(product.slug));
    return NextResponse.json({ data: product });
  });
}

export async function DELETE(_request: Request, { params }: Context) {
  const { id } = await params;
  return withSession(async (token) => {
    // 削除すると slug が分からなくなるので先に取る
    const product = await fetchAdminProduct(token, Number(id));
    await deleteProduct(token, Number(id));
    revalidate(tags.products, tags.categories, tags.product(product.slug));
    return noContent();
  });
}
