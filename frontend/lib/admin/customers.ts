// 管理画面の会員（閲覧のみ。読み取りなので Server Component から直接呼ぶ）。

import { apiFetch, bearer } from "@/lib/api";
import type { AdminCustomer, ApiPaginated, ApiResource } from "@/lib/types";

export type AdminCustomerListParams = { q?: string; page?: number };

/** GET /api/admin/customers … role=customer を新しい順に 20 件ずつ。?q= は名前・メールの部分一致 */
export async function fetchAdminCustomers(
  token: string,
  params: AdminCustomerListParams = {},
): Promise<ApiPaginated<AdminCustomer>> {
  const query = new URLSearchParams();
  if (params.q) query.set("q", params.q);
  if (params.page && params.page > 1) query.set("page", String(params.page));

  const suffix = query.size > 0 ? `?${query}` : "";
  return apiFetch<ApiPaginated<AdminCustomer>>(`/api/admin/customers${suffix}`, { headers: bearer(token) });
}

/** GET /api/admin/customers/{id} … 会員 1 人（存在しない id・管理者の id は 404） */
export async function fetchAdminCustomer(token: string, id: number): Promise<AdminCustomer> {
  const result = await apiFetch<ApiResource<AdminCustomer>>(`/api/admin/customers/${id}`, { headers: bearer(token) });
  return result.data;
}
