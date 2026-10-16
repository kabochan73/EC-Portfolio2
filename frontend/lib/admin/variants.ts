// 管理画面のバリアント（サーバー専用。BFF から）。
// URL は shallow: 作成は /products/{id}/variants、作成後は /variants/{id} だけで特定できる（backend/routes/admin.php）

import { apiFetch, bearer, bearerJson } from "@/lib/api";
import type { CreateVariantPayload, UpdateVariantPayload } from "@/lib/schemas/adminVariant";
import type { AdminProductVariant, ApiResource } from "@/lib/types";

/** POST /api/admin/products/{productId}/variants（同じ商品で size + color が重複すると 422） */
export async function createVariant(
  token: string,
  productId: number,
  payload: CreateVariantPayload,
): Promise<AdminProductVariant> {
  const result = await apiFetch<ApiResource<AdminProductVariant>>(
    `/api/admin/products/${productId}/variants`,
    bearerJson(token, "POST", payload),
  );
  return result.data;
}

/** PUT /api/admin/variants/{id}（size は変えられない） */
export async function updateVariant(
  token: string,
  id: number,
  payload: UpdateVariantPayload,
): Promise<AdminProductVariant> {
  const result = await apiFetch<ApiResource<AdminProductVariant>>(
    `/api/admin/variants/${id}`,
    bearerJson(token, "PUT", payload),
  );
  return result.data;
}

/** DELETE /api/admin/variants/{id}（注文明細の variant_id は SET NULL になる） */
export async function deleteVariant(token: string, id: number): Promise<void> {
  await apiFetch<void>(`/api/admin/variants/${id}`, { method: "DELETE", headers: bearer(token) });
}
