import type { Metadata } from "next";

import SalesChart from "@/components/admin/sales/SalesChart";
import SalesKpiCards from "@/components/admin/sales/SalesKpiCards";
import SalesRanking from "@/components/admin/sales/SalesRanking";
import { fetchSalesDashboard } from "@/lib/admin/sales";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Sales" };

/**
 * 売上ダッシュボード（Server Component。R4 の新機能。docs/05-admin.md）。
 * KPI・日別⇔月別の棒グラフ・カテゴリ別ランキング。運用のダッシュボード（/admin）とは別ページ
 * （2026-10-16 ユーザーの判断）。CC は棒グラフの切り替えだけ（docs/08 §3.6）
 */
export default async function AdminSalesPage() {
  const { token } = await requireAdmin("/admin/sales");
  const sales = await fetchSalesDashboard(token);

  return (
    <div>
      <h1 className="mb-8 text-xl tracking-widest uppercase">Sales</h1>

      <section>
        <SalesKpiCards kpi={sales.kpi} />
        <div className="mt-4">
          <SalesChart daily={sales.daily} monthly={sales.monthly} />
        </div>
      </section>

      <section className="mt-12">
        <h2 className="mb-4 text-[11px] tracking-widest text-graphite uppercase">
          Ranking by Category (This Month)
        </h2>
        <SalesRanking ranking={sales.ranking} />
      </section>
    </div>
  );
}
