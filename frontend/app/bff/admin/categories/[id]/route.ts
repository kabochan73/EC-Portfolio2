// ブラウザ → PUT/DELETE /bff/admin/categories/{id} → Laravel。
// 名前・slug は商品カードにも出るので、categories と products の両方のキャッシュを捨てる。
// 所属商品があるカテゴリの削除は Laravel が 409（メッセージはそのまま中継）。

import { NextResponse } from "next/server";

import { deleteCategory, updateCategory } from "@/lib/admin/categories";
import { noContent, withSession } from "@/lib/bff";
import { revalidate, tags } from "@/lib/revalidate";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Ctx) {
  const { id } = await params;
  const body = await request.json();

  return withSession(async (token) => {
    const category = await updateCategory(token, Number(id), body);
    revalidate(tags.categories, tags.products);
    return NextResponse.json({ data: category });
  });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const { id } = await params;

  return withSession(async (token) => {
    await deleteCategory(token, Number(id));
    revalidate(tags.categories, tags.products);
    return noContent();
  });
}
