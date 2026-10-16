// ブラウザ → PUT /bff/admin/products/{id}/images/reorder → Laravel の同じパス。

import { reorderProductImages } from "@/lib/admin/productImages";
import { revalidateProductCaches } from "@/lib/admin/products";
import { noContent, withSession } from "@/lib/bff";

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Context) {
  const { id } = await params;
  const { order } = await request.json();
  return withSession(async (token) => {
    await reorderProductImages(token, Number(id), order);
    await revalidateProductCaches(token, Number(id));
    return noContent(); // 画面は router.refresh() で描き直すので、並べ替え後の一覧は返さない
  });
}
