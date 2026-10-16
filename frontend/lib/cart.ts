import { apiFetch } from "@/lib/api";
import type { ApiCollection, CartLineValidation } from "@/lib/types";

/**
 * カート明細の再検証（GET /api/cart/validate）。BFF Route Handler から呼ぶ（サーバー専用）。
 * 各 variant の現在価格・在庫ステータス・購入可否・数量上限・商品情報を返す。
 */
export async function validateCartLines(variantIds: number[]): Promise<CartLineValidation[]> {
  if (variantIds.length === 0) {
    return [];
  }

  const params = new URLSearchParams();
  for (const id of variantIds) {
    params.append("variant_ids[]", String(id));
  }

  const res = await apiFetch<ApiCollection<CartLineValidation>>(
    `/api/cart/validate?${params.toString()}`,
  );

  return res.data;
}
