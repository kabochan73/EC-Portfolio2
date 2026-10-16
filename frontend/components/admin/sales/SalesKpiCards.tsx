import StatCard from "@/components/admin/StatCard";
import { formatYen } from "@/lib/format";
import type { SalesKpi } from "@/lib/types";

/** 売上の KPI 3 枚（今月の売上・今月の注文数・今日の売上）。Server Component。 */
export default function SalesKpiCards({ kpi }: { kpi: SalesKpi }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <StatCard label="This Month Revenue" value={formatYen(kpi.month_revenue)} />
      <StatCard label="This Month Orders" value={kpi.month_orders} />
      <StatCard label="Today Revenue" value={formatYen(kpi.today_revenue)} />
    </div>
  );
}
