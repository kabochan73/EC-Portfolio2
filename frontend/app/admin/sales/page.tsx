import type { Metadata } from "next";
import { redirect } from "next/navigation";

import RankingMonthNav, { formatMonth } from "@/components/admin/sales/RankingMonthNav";
import SalesChart from "@/components/admin/sales/SalesChart";
import SalesKpiCards from "@/components/admin/sales/SalesKpiCards";
import SalesRanking from "@/components/admin/sales/SalesRanking";
import { fetchSalesDashboard } from "@/lib/admin/sales";
import { ApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import type { SalesDashboard } from "@/lib/types";

export const metadata: Metadata = { title: "Sales" };

type PageProps = { searchParams: Promise<{ month?: string }> };

/**
 * 売上ダッシュボード（Server Component。R4 の新機能。docs/05-admin.md）。
 * KPI・日別⇔月別の棒グラフ・カテゴリ別ランキング。運用のダッシュボード（/admin）とは別ページ
 * （2026-10-16 ユーザーの判断）。CC は棒グラフだけ（docs/08 §3.6）。
 * ?month=YYYY-MM でランキングの月を選ぶ（R4 追加 2026-10-17。矢印と月別グラフの棒から）
 */
export default async function AdminSalesPage({ searchParams }: PageProps) {
  const { month } = await searchParams;
  const { token } = await requireAdmin("/admin/sales");

  let sales: SalesDashboard;
  try {
    sales = await fetchSalesDashboard(token, month);
  } catch (error) {
    // 過去 12 か月の外・形式違いの ?month= は Laravel が 422 → 今月に戻す
    if (month && error instanceof ApiError && error.status === 422) redirect("/admin/sales");
    throw error;
  }

  const months = sales.monthly.map((m) => m.month);

  return (
    <div>
      <h1 className="mb-8 text-xl tracking-widest uppercase">Sales</h1>

      <section>
        <SalesKpiCards kpi={sales.kpi} />
        <div className="mt-4">
          <SalesChart
            daily={sales.daily}
            monthly={sales.monthly}
            selectedMonth={sales.ranking_month}
            initialMode={month ? "monthly" : "daily"}
          />
        </div>
      </section>

      <section className="mt-12">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[11px] tracking-widest text-graphite uppercase">
            Ranking by Category ({formatMonth(sales.ranking_month)})
          </h2>
          <RankingMonthNav month={sales.ranking_month} months={months} />
        </div>
        <SalesRanking ranking={sales.ranking} />
      </section>
    </div>
  );
}
