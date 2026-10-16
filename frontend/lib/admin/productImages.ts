// 管理画面の商品画像（サーバー専用。BFF から）。保存後のキャッシュ消しは lib/admin/products.ts の revalidateProductCaches

import { apiFetch, bearer, bearerJson } from "@/lib/api";
import type { ApiCollection, ApiResource, ProductImage } from "@/lib/types";

/** POST /api/admin/products/{id}/images（multipart。5MB まで。バケットに保存して行を作る） */
export async function uploadProductImage(token: string, productId: number, file: File): Promise<ProductImage> {
  const formData = new FormData();
  formData.append("image", file);

  // Content-Type は付けない（FormData を渡すと fetch が boundary 込みで付ける）
  const result = await apiFetch<ApiResource<ProductImage>>(`/api/admin/products/${productId}/images`, {
    method: "POST",
    headers: bearer(token),
    body: formData,
  });
  return result.data;
}

/** PUT /api/admin/products/{id}/images/reorder（{ order: [imageId, ...] }。0 番目 = 主画像・1 番目 = ホバー画像） */
export async function reorderProductImages(token: string, productId: number, order: number[]): Promise<ProductImage[]> {
  const result = await apiFetch<ApiCollection<ProductImage>>(
    `/api/admin/products/${productId}/images/reorder`,
    bearerJson(token, "PUT", { order }),
  );
  return result.data;
}

/** DELETE /api/admin/product-images/{id}（バケットのファイルも消える） */
export async function deleteProductImage(token: string, imageId: number): Promise<void> {
  await apiFetch<void>(`/api/admin/product-images/${imageId}`, { method: "DELETE", headers: bearer(token) });
}
