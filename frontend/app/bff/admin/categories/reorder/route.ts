// ブラウザ → PUT /bff/admin/categories/reorder → Laravel（並べ替え）。トップのカテゴリの並びが変わる。

import { reorderCategories } from "@/lib/admin/categories";
import { noContent, withSession } from "@/lib/bff";
import { revalidate, tags } from "@/lib/revalidate";

export async function PUT(request: Request) {
  const { order } = (await request.json()) as { order: number[] };

  return withSession(async (token) => {
    await reorderCategories(token, order);
    revalidate(tags.categories);
    return noContent();
  });
}
