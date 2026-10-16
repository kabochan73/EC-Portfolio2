import type { Metadata } from "next";

import OrderTable from "@/components/admin/OrderTable";
import StatCard from "@/components/admin/StatCard";
import { fetchDashboardStats } from "@/lib/admin/dashboard";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Admin Dashboard" };

/**
 * 管理画面のダッシュボード（Server Component）。運用の数字（注文・未払い・在庫）と最近の注文。
 * 売上（KPI・グラフ・ランキング）は /admin/sales に分けた（2026-10-16 ユーザーの判断）
 */
export default async function AdminDashboardPage() {
  const { token } = await requireAdmin("/admin");
  const stats = await fetchDashboardStats(token);

  return (
    <div>
      <h1 className="mb-8 text-xl tracking-widest uppercase">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Orders" value={stats.orders_count} />
        <StatCard label="Pending" value={stats.pending_count} />
        <StatCard label="Low Stock" value={stats.low_stock_count} />
        <StatCard label="Sold Out" value={stats.sold_out_count} />
      </div>

      <section className="mt-10">
        <h2 className="mb-4 text-[11px] tracking-widest text-graphite uppercase">Recent Orders</h2>
        <OrderTable orders={stats.recent_orders} emptyText="No orders yet." />
      </section>
    </div>
  );
}
