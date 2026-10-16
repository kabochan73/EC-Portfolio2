// 管理画面（backend/app/Http/Resources/Admin/* と DashboardController）。

import type { OrderStatus } from "./order";

/** 注文の顧客（削除済みユーザーなら null） */
export type AdminCustomerRef = { id: number | null; name: string | null; email: string | null };

// Admin/OrderListResource（注文一覧・ダッシュボードの最近の注文）
export type AdminOrderListItem = {
  order_number: string;
  status: OrderStatus;
  total: number;
  item_count: number;
  customer: AdminCustomerRef;
  placed_at: string | null;
  paid_at: string | null;
};

// GET /api/admin/stats（revenue_total は累計。月・日の売上は売上ダッシュボード API が担当）
export type DashboardStats = {
  orders_count: number;
  revenue_total: number;
  pending_count: number;
  sold_out_count: number;
  low_stock_count: number;
  recent_orders: AdminOrderListItem[];
};
