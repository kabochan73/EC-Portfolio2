// 管理画面の商品（サーバー専用。Server Component / BFF から）。

import { apiFetch, bearer, bearerJson } from "@/lib/api";
import { revalidate, tags } from "@/lib/revalidate";
import type { AdminProductPayload } from "@/lib/schemas/adminProduct";
import type { AdminProduct, AdminProductListItem, ApiPaginated, ApiResource } from "@/lib/types";

export type AdminProductListParams = { q?: string; category?: string; page?: number };

/** GET /api/admin/products … 未公開も含む。検索・カテゴリ絞り込み・20 件ずつ（空の値は送らない） */
export async function fetchAdminProducts(
  token: string,
  params: AdminProductListParams = {},
): Promise<ApiPaginated<AdminProductListItem>> {
  const query = new URLSearchParams();
  if (params.q) query.set("q", params.q);
  if (params.category) query.set("category", params.category);
  if (params.page && params.page > 1) query.set("page", String(params.page));

  const suffix = query.size > 0 ? `?${query}` : "";
  return apiFetch<ApiPaginated<AdminProductListItem>>(`/api/admin/products${suffix}`, {
    headers: bearer(token),
  });
}

/** GET /api/admin/products/{id} … 編集用（images / variants 込み） */
export async function fetchAdminProduct(token: string, id: number): Promise<AdminProduct> {
  const result = await apiFetch<ApiResource<AdminProduct>>(`/api/admin/products/${id}`, {
    headers: bearer(token),
  });
  return result.data;
}

/** POST /api/admin/products */
export async function createProduct(token: string, payload: AdminProductPayload): Promise<AdminProduct> {
  const result = await apiFetch<ApiResource<AdminProduct>>(
    "/api/admin/products",
    bearerJson(token, "POST", payload),
  );
  return result.data;
}

/** PUT /api/admin/products/{id} */
export async function updateProduct(
  token: string,
  id: number,
  payload: AdminProductPayload,
): Promise<AdminProduct> {
  const result = await apiFetch<ApiResource<AdminProduct>>(
    `/api/admin/products/${id}`,
    bearerJson(token, "PUT", payload),
  );
  return result.data;
}

/** DELETE /api/admin/products/{id}（注文明細の product_id は SET NULL になる） */
export async function deleteProduct(token: string, id: number): Promise<void> {
  await apiFetch<void>(`/api/admin/products/${id}`, { method: "DELETE", headers: bearer(token) });
}

/**
 * 画像・バリアントを変えた後に、商品一覧と商品ページのキャッシュを消す（Step 46 の BFF から）。
 * slug を知るために商品を取り直す。取れなくても一覧だけは消す
 */
export async function revalidateProductCaches(token: string, productId: number): Promise<void> {
  try {
    const product = await fetchAdminProduct(token, productId);
    revalidate(tags.products, tags.product(product.slug));
  } catch {
    revalidate(tags.products);
  }
}
