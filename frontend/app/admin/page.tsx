import type { Metadata } from "next";
import Link from "next/link";

import OrderTable from "@/components/admin/OrderTable";
import StatCard from "@/components/admin/StatCard";
import { fetchDashboardStats } from "@/lib/admin/dashboard";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Admin Dashboard" };

/**
 * 運用ダッシュボード（Server Component）。管理者が「次にやること」の数と、未発送の注文（決済の古い順）。
 * R4（2026-10-17 ユーザーの判断）: 注文件数・Pending・最近の注文 5 件から変更。Pending（決済待ち）は
 * 30 分で自動キャンセルされ、やることが無いので出さず、代わりに受け取り待ち（shipped → completed にする）。
 * 売上（KPI・グラフ・ランキング）は /admin/sales
 */
export default async function AdminDashboardPage() {
  const { token } = await requireAdmin("/admin");
  const stats = await fetchDashboardStats(token);
  const hasMore = stats.unshipped_count > stats.unshipped_orders.length;

  return (
    <div>
      <h1 className="mb-8 text-xl tracking-widest uppercase">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Unshipped" value={stats.unshipped_count} href="/admin/orders?status=paid" />
        <StatCard label="Awaiting Delivery" value={stats.awaiting_delivery_count} href="/admin/orders?status=shipped" />
        <StatCard label="Low Stock" value={stats.low_stock_count} />
        <StatCard label="Sold Out" value={stats.sold_out_count} />
      </div>

      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-[11px] tracking-widest text-graphite uppercase">Unshipped Orders (Oldest First)</h2>
          {hasMore && (
            <Link href="/admin/orders?status=paid" className="text-xs tracking-widest uppercase underline underline-offset-2">
              View All ({stats.unshipped_count})
            </Link>
          )}
        </div>
        <OrderTable orders={stats.unshipped_orders} emptyText="未発送の注文はありません。" />
      </section>
    </div>
  );
}
