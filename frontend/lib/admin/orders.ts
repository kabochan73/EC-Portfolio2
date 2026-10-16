// 管理画面の注文（サーバー専用。Server Component / BFF から）。

import { apiFetch, bearer, bearerJson } from "@/lib/api";
import type { AdminOrderDetail, AdminOrderListItem, ApiPaginated, ApiResource, OrderStatus } from "@/lib/types";

export type AdminOrderListParams = { status?: string; customerId?: number; page?: number };

/** GET /api/admin/orders … 全ユーザーの注文を新しい順に 20 件ずつ。?status= / ?customer_id=（会員詳細の注文履歴） */
export async function fetchAdminOrders(
  token: string,
  params: AdminOrderListParams = {},
): Promise<ApiPaginated<AdminOrderListItem>> {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.customerId) query.set("customer_id", String(params.customerId));
  if (params.page && params.page > 1) query.set("page", String(params.page));

  const suffix = query.size > 0 ? `?${query}` : "";
  return apiFetch<ApiPaginated<AdminOrderListItem>>(`/api/admin/orders${suffix}`, { headers: bearer(token) });
}

/** GET /api/admin/orders/{number} … 明細・配送先・顧客・決済情報 */
export async function fetchAdminOrder(token: string, orderNumber: string): Promise<AdminOrderDetail> {
  const result = await apiFetch<ApiResource<AdminOrderDetail>>(`/api/admin/orders/${orderNumber}`, {
    headers: bearer(token),
  });
  return result.data;
}

/**
 * PUT /api/admin/orders/{number}/status … 管理者が送れるのは shipped / completed / cancelled だけ。
 * 不正な遷移は 422。paid → cancelled は Stripe で返金（docs/02 の state machine）
 */
export async function updateOrderStatus(
  token: string,
  orderNumber: string,
  status: OrderStatus,
): Promise<AdminOrderDetail> {
  const result = await apiFetch<ApiResource<AdminOrderDetail>>(
    `/api/admin/orders/${orderNumber}/status`,
    bearerJson(token, "PUT", { status }),
  );
  return result.data;
}
