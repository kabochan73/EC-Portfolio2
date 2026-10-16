import type { Metadata } from "next";
import Link from "next/link";

import Pagination from "@/components/admin/Pagination";
import { fetchAdminCustomers } from "@/lib/admin/customers";
import { requireAdmin } from "@/lib/auth";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Admin Customers" };

type PageProps = { searchParams: Promise<{ q?: string; page?: string }> };

/**
 * 会員一覧（Server Component・閲覧のみ）。検索とページ送りは URL のクエリだけ。
 * R4: 登録日は formatDate で日本時間（R3 は toLocaleDateString で UTC のまま。深夜 0〜9 時の登録が前日になっていた）
 */
export default async function AdminCustomersPage({ searchParams }: PageProps) {
  const { q, page } = await searchParams;
  const { token } = await requireAdmin("/admin/customers");
  const currentPage = Math.max(1, Number(page) || 1);

  const result = await fetchAdminCustomers(token, { q, page: currentPage });

  function hrefFor(target: number): string {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (target > 1) params.set("page", String(target));
    return params.size > 0 ? `/admin/customers?${params}` : "/admin/customers";
  }

  return (
    <div>
      <h1 className="mb-8 text-xl tracking-widest uppercase">Customers</h1>

      <form method="get" className="mb-6 flex flex-wrap items-end gap-4">
        <div>
          <label htmlFor="q" className="block text-[11px] tracking-widest text-graphite uppercase">
            Search
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q}
            placeholder="Name or email"
            className="mt-2 w-64 border-b border-ink bg-transparent py-2 text-sm outline-none"
          />
        </div>
        <button
          type="submit"
          className="border border-ink px-6 py-2 text-xs tracking-widest uppercase transition-colors hover:bg-mist"
        >
          Search
        </button>
      </form>

      {result.data.length === 0 ? (
        <p className="text-sm text-graphite">No customers found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-ink text-left text-[11px] tracking-widest text-graphite uppercase">
                <th className="py-2 pr-4 font-normal">Name</th>
                <th className="py-2 pr-4 font-normal">Email</th>
                <th className="py-2 pr-4 font-normal">Orders</th>
                <th className="py-2 font-normal">Registered</th>
              </tr>
            </thead>
            <tbody>
              {result.data.map((customer) => (
                <tr key={customer.id} className="border-b border-mist">
                  <td className="py-3 pr-4">
                    <Link href={`/admin/customers/${customer.id}`} className="hover:underline">
                      {customer.name}
                    </Link>
                  </td>
                  <td className="py-3 pr-4 text-graphite">{customer.email}</td>
                  <td className="py-3 pr-4">{customer.orders_count}</td>
                  <td className="py-3 whitespace-nowrap text-graphite">{formatDate(customer.joined_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination currentPage={result.meta.current_page} lastPage={result.meta.last_page} hrefFor={hrefFor} />
    </div>
  );
}
