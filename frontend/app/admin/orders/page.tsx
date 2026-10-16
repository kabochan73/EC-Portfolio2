import type { Metadata } from "next";

import OrderTable from "@/components/admin/OrderTable";
import Pagination from "@/components/admin/Pagination";
import { fetchAdminOrders } from "@/lib/admin/orders";
import { requireAdmin } from "@/lib/auth";
import type { OrderStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Admin Orders" };

const STATUSES: OrderStatus[] = ["pending", "paid", "shipped", "completed", "cancelled"];

type PageProps = { searchParams: Promise<{ status?: string; page?: string }> };

/** 注文一覧（Server Component）。ステータスの絞り込みとページ送りは商品一覧と同じく URL のクエリだけ */
export default async function AdminOrdersPage({ searchParams }: PageProps) {
  const { status, page } = await searchParams;
  const { token } = await requireAdmin("/admin/orders");
  const currentPage = Math.max(1, Number(page) || 1);

  const result = await fetchAdminOrders(token, { status, page: currentPage });

  function hrefFor(target: number): string {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (target > 1) params.set("page", String(target));
    return params.size > 0 ? `/admin/orders?${params}` : "/admin/orders";
  }

  return (
    <div>
      <h1 className="mb-8 text-xl tracking-widest uppercase">Orders</h1>

      <form method="get" className="mb-6 flex flex-wrap items-end gap-4">
        <div>
          <label htmlFor="status" className="block text-[11px] tracking-widest text-graphite uppercase">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={status ?? ""}
            className="mt-2 w-40 border-b border-ink bg-transparent py-2 text-sm outline-none"
          >
            <option value="">All</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="border border-ink px-6 py-2 text-xs tracking-widest uppercase transition-colors hover:bg-mist"
        >
          Filter
        </button>
      </form>

      <OrderTable orders={result.data} />
      <Pagination currentPage={result.meta.current_page} lastPage={result.meta.last_page} hrefFor={hrefFor} />
    </div>
  );
}
