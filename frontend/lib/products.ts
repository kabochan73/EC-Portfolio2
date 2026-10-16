import { apiFetch, ApiError } from "@/lib/api";
import { revalidateSeconds, tags } from "@/lib/revalidate";
import type { ApiCollection, ApiResource, ProductDetail, ProductSummary } from "@/lib/types";

type GetProductsOptions = {
  category?: string;
  isNew?: boolean;
  limit?: number;
};

/**
 * 公開商品一覧（カード表示用）。GET /api/products。
 * ISR: タグ products。管理側の商品/画像/バリアント更新で revalidate される。
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

/**
 * 公開商品詳細。GET /api/products/{slug}。未公開・存在しない slug は null。
 * ISR: タグ product:{slug} と products。
 */
export async function getProduct(slug: string): Promise<ProductDetail | null> {
  try {
    const res = await apiFetch<ApiResource<ProductDetail>>(`/api/products/${slug}`, {
      next: {
        tags: [tags.product(slug), tags.products],
        revalidate: revalidateSeconds.products,
      },
    });

    return res.data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}
