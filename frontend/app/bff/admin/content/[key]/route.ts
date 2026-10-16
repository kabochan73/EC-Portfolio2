// ブラウザ → PUT /bff/admin/content/{key} → Laravel /api/admin/content/{key}。
// 保存したらトップページのキャッシュ（tag: content）を消して、すぐ反映させる。
// R4: GET は作らない（R3 にはあったが、どこからも使われていなかった。編集ページは SC が lib を直接呼ぶ）

import { NextResponse } from "next/server";

import { updateContent } from "@/lib/admin/content";
import { withSession } from "@/lib/bff";
import { revalidate, tags } from "@/lib/revalidate";
import type { ContentKey } from "@/lib/types";

type Context = { params: Promise<{ key: string }> };

export async function PUT(request: Request, { params }: Context) {
  const { key } = await params;
  const body = await request.json();
  return withSession(async (token) => {
    // 知らない key は Laravel のルート（whereIn）が 404 を返す
    const data = await updateContent(token, key as ContentKey, body);
    revalidate(tags.content);
    return NextResponse.json({ data });
  });
}
