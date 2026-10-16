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

// ── 売上ダッシュボード（GET /api/admin/sales。R4 の新機能。docs/05-admin.md）──
// 日付・月はすべて日本時間。daily は今月の全日、monthly は過去 12 か月（今月を含む）を 0 埋めで返す

export type SalesKpi = {
  month_revenue: number;
  month_orders: number;
  today_revenue: number;
};

export type DailyRevenue = { date: string; revenue: number }; // date: "2026-10-01"
export type MonthlyRevenue = { month: string; revenue: number }; // month: "2026-10"

export type RankedProduct = {
  id: number;
  name: string;
  /** 今月の販売個数（並び順の基準） */
  quantity: number;
  revenue: number;
  last_month_quantity: number;
  /** 個数の前月比（今月 ÷ 先月 1 か月分）。先月 0 個なら null */
  mom_ratio: number | null;
};

export type CategoryRanking = {
  category: { id: number; name: string };
  products: RankedProduct[];
};

export type SalesDashboard = {
  kpi: SalesKpi;
  daily: DailyRevenue[];
  monthly: MonthlyRevenue[];
  ranking: CategoryRanking[];
};
