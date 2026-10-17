// 売上ダッシュボードの取得（R4 の新機能）。読み取りなので Server Component から直接呼ぶ（docs/08 §3.6）。
// 日別・月別の両方を 1 回で受け取り、グラフの切り替えはブラウザ側だけで行う（再取得しない）。

import { apiFetch, bearer } from "@/lib/api";
import type { ApiResource, SalesDashboard } from "@/lib/types";

/**
 * GET /api/admin/sales（?month=YYYY-MM でランキングの月を選ぶ。過去 12 か月以外は 422。
 * 省略は今月。R4 追加 2026-10-17）
 */
export async function fetchSalesDashboard(token: string, month?: string): Promise<SalesDashboard> {
  const query = month ? `?month=${encodeURIComponent(month)}` : "";
  const { data } = await apiFetch<ApiResource<SalesDashboard>>(`/api/admin/sales${query}`, {
    headers: bearer(token),
  });
  return data;
}
