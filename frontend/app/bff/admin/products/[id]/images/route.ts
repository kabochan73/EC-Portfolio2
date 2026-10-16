// ブラウザ → POST /bff/admin/products/{id}/images（multipart）→ Laravel の同じパス。

import { NextResponse } from "next/server";

import { uploadProductImage } from "@/lib/admin/productImages";
import { revalidateProductCaches } from "@/lib/admin/products";
import { withSession } from "@/lib/bff";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  const { id } = await params;
  const file = (await request.formData()).get("image");

  if (!(file instanceof File)) {
    return NextResponse.json({ message: "画像ファイルを選択してください。" }, { status: 422 });
  }

  return withSession(async (token) => {
    const image = await uploadProductImage(token, Number(id), file);
    await revalidateProductCaches(token, Number(id));
    return NextResponse.json({ data: image }, { status: 201 });
  });
}
