// ブラウザ → DELETE /bff/admin/product-images/{id}?product={productId} → Laravel /api/admin/product-images/{id}。
// Laravel 側は画像 id だけで消せる（shallow）が、キャッシュを消すには商品が要るので ?product= で受け取る

import { deleteProductImage } from "@/lib/admin/productImages";
import { revalidateProductCaches } from "@/lib/admin/products";
import { noContent, withSession } from "@/lib/bff";
import { revalidate, tags } from "@/lib/revalidate";

type Context = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, { params }: Context) {
  const { id } = await params;
  const productId = Number(new URL(request.url).searchParams.get("product"));
  return withSession(async (token) => {
    await deleteProductImage(token, Number(id));
    if (productId) await revalidateProductCaches(token, productId);
    else revalidate(tags.products);
    return noContent();
  });
}
