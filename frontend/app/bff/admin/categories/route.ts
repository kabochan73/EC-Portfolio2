// ブラウザ → POST /bff/admin/categories → Laravel（追加）。トップのカテゴリ一覧のキャッシュを捨てる。
// 一覧の GET は無い（R4。一覧は /admin/categories の SC が取り、操作後は router.refresh()。docs/08 §3.6）

import { NextResponse } from "next/server";

import { createCategory } from "@/lib/admin/categories";
import { withSession } from "@/lib/bff";
import { revalidate, tags } from "@/lib/revalidate";

export async function POST(request: Request) {
  const body = await request.json();

  return withSession(async (token) => {
    const category = await createCategory(token, body);
    revalidate(tags.categories);
    return NextResponse.json({ data: category }, { status: 201 });
  });
}
