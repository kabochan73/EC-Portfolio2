// 管理画面のカテゴリ（サーバー専用。Server Component / BFF から）。

import { apiFetch, bearer, bearerJson } from "@/lib/api";
import type { AdminCategoryFormValues } from "@/lib/schemas/adminCategory";
import type { AdminCategory, ApiCollection, ApiResource } from "@/lib/types";

/** GET /api/admin/categories … position 昇順・所属商品数つき */
export async function fetchAdminCategories(token: string): Promise<AdminCategory[]> {
  const result = await apiFetch<ApiCollection<AdminCategory>>("/api/admin/categories", {
    headers: bearer(token),
  });
  return result.data;
}

/** POST /api/admin/categories（末尾に追加） */
export async function createCategory(token: string, payload: AdminCategoryFormValues): Promise<AdminCategory> {
  const result = await apiFetch<ApiResource<AdminCategory>>(
    "/api/admin/categories",
    bearerJson(token, "POST", payload),
  );
  return result.data;
}

/** PUT /api/admin/categories/{id} */
export async function updateCategory(
  token: string,
  id: number,
  payload: AdminCategoryFormValues,
): Promise<AdminCategory> {
  const result = await apiFetch<ApiResource<AdminCategory>>(
    `/api/admin/categories/${id}`,
    bearerJson(token, "PUT", payload),
  );
  return result.data;
}

/** DELETE /api/admin/categories/{id}（所属商品があると 409） */
export async function deleteCategory(token: string, id: number): Promise<void> {
  await apiFetch<void>(`/api/admin/categories/${id}`, { method: "DELETE", headers: bearer(token) });
}

/** PUT /api/admin/categories/reorder（{ order: [id, ...] } の順に position を振り直す） */
export async function reorderCategories(token: string, order: number[]): Promise<void> {
  await apiFetch<unknown>("/api/admin/categories/reorder", bearerJson(token, "PUT", { order }));
}
