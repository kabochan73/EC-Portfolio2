import { ApiError, apiFetch, bearerJson } from "@/lib/api";
import type {
  ApiCollection,
  ApiResource,
  CreateOrderRequest,
  OrderDetail,
  OrderListItem,
} from "@/lib/types";

// 注文の作成・取得（サーバー専用。Server Component / BFF から）。

/** GET /api/orders … 本人の注文一覧（新しい順・要約） */
export async function getMyOrders(token: string): Promise<OrderListItem[]> {
  const res = await apiFetch<ApiCollection<OrderListItem>>("/api/orders", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

/** GET /api/orders/{order_number} … 本人の注文詳細。他人・不明は null */
export async function getMyOrder(token: string, orderNumber: string): Promise<OrderDetail | null> {
  try {
    const res = await apiFetch<ApiResource<OrderDetail>>(
      `/api/orders/${encodeURIComponent(orderNumber)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    return res.data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * POST /api/orders … 配送先を確定して pending 注文を作成し、在庫を引き当てる。
 * 同じユーザーの未決済注文は Laravel 側で置き換えられる。在庫不足・非公開は 422。
 */
export async function createOrder(token: string, payload: CreateOrderRequest): Promise<OrderDetail> {
  const res = await apiFetch<ApiResource<OrderDetail>>("/api/orders", bearerJson(token, "POST", payload));
  return res.data;
}
