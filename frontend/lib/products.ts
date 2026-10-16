import { apiFetch } from "@/lib/api";
import { revalidateSeconds, tags } from "@/lib/revalidate";
import type { ApiCollection, ProductSummary } from "@/lib/types";

type GetProductsOptions = {
  category?: string;
  isNew?: boolean;
  limit?: number;
};

/**
 * 公開商品一覧（カード表示用）。GET /api/products。
 * ISR: タグ products。管理側の商品/画像/バリアント更新で revalidate される。
 * 商品詳細（getProduct）は Step 34 で足す。
 */
export async function getProducts(options: GetProductsOptions = {}): Promise<ProductSummary[]> {
  const params = new URLSearchParams();
  if (options.category) params.set("category", options.category);
  if (options.isNew) params.set("new", "true");
  if (options.limit) params.set("limit", String(options.limit));

  const query = params.toString();
  const res = await apiFetch<ApiCollection<ProductSummary>>(
    `/api/products${query ? `?${query}` : ""}`,
    { next: { tags: [tags.products], revalidate: revalidateSeconds.products } },
  );

  return res.data;
}
