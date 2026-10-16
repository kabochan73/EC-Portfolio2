// ダッシュボードの数字の取得。読み取りなので Server Component から直接呼ぶ（docs/08 §3.6）。

import { apiFetch, bearer } from "@/lib/api";
import type { ApiResource, DashboardStats } from "@/lib/types";

/** GET /api/admin/stats */
export async function fetchDashboardStats(token: string): Promise<DashboardStats> {
  const { data } = await apiFetch<ApiResource<DashboardStats>>("/api/admin/stats", {
    headers: bearer(token),
  });
  return data;
}
