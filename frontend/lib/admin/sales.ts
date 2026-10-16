// 売上ダッシュボードの取得（R4 の新機能）。読み取りなので Server Component から直接呼ぶ（docs/08 §3.6）。
// 日別・月別の両方を 1 回で受け取り、グラフの切り替えはブラウザ側だけで行う（再取得しない）。

import { apiFetch, bearer } from "@/lib/api";
import type { ApiResource, SalesDashboard } from "@/lib/types";

/** GET /api/admin/sales */
export async function fetchSalesDashboard(token: string): Promise<SalesDashboard> {
  const { data } = await apiFetch<ApiResource<SalesDashboard>>("/api/admin/sales", {
    headers: bearer(token),
  });
  return data;
}
