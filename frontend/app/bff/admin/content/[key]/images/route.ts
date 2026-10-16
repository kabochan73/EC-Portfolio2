// ブラウザ → POST /bff/admin/content/{key}/images（multipart）→ Laravel の同じパス。
// 返すのは { url } だけ。この時点ではまだ data に入っていないので、キャッシュは消さない（セクションの保存で消える）

import { NextResponse } from "next/server";

import { uploadContentImage } from "@/lib/admin/content";
import { withSession } from "@/lib/bff";
import type { ContentKey } from "@/lib/types";

type Context = { params: Promise<{ key: string }> };

export async function POST(request: Request, { params }: Context) {
  const { key } = await params;
  const file = (await request.formData()).get("image");

  if (!(file instanceof File)) {
    return NextResponse.json({ message: "画像ファイルを選択してください。" }, { status: 422 });
  }

  return withSession(async (token) => {
    const url = await uploadContentImage(token, key as ContentKey, file);
    return NextResponse.json({ url }, { status: 201 });
  });
}
