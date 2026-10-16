import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import OrderTable from "@/components/admin/OrderTable";
import Pagination from "@/components/admin/Pagination";
import { fetchAdminCustomer } from "@/lib/admin/customers";
import { fetchAdminOrders } from "@/lib/admin/orders";
import { ApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import type { AdminCustomer, AdminOrderListItem, ApiPaginated } from "@/lib/types";

export const metadata: Metadata = { title: "Customer" };

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
};

/**
 * 会員詳細（Server Component・閲覧のみ）。会員の情報と、その人の注文履歴（注文一覧 API の ?customer_id=）。
 * R4: 会員と注文履歴は互いに関係ないので同時に取る（R3 は順番に取っていた）
 */
export default async function AdminCustomerDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { page } = await searchParams;
  const { token } = await requireAdmin(`/admin/customers/${id}`);
  const customerId = Number(id);
  const currentPage = Math.max(1, Number(page) || 1);

  let customer: AdminCustomer;
  let orders: ApiPaginated<AdminOrderListItem>;
  try {
    [customer, orders] = await Promise.all([
      fetchAdminCustomer(token, customerId),
      fetchAdminOrders(token, { customerId, page: currentPage }),
    ]);
  } catch (error) {
    // 存在しない id は会員が 404、注文側も customer_id の exists で 422 になる
    if (error instanceof ApiError && (error.status === 404 || error.status === 422)) notFound();
    throw error;
  }

  return (
    <div>
      <nav className="mb-6 text-[11px] tracking-widest text-graphite uppercase">
        <Link href="/admin/customers" className="hover:text-ink">
          Customers
        </Link>
        <span className="mx-2">/</span>
        <span>{customer.name}</span>
      </nav>

      <h1 className="text-xl tracking-widest uppercase">{customer.name}</h1>
      <dl className="mt-3 space-y-1 text-sm text-graphite">
        <div className="flex gap-3">
          <dt>Email</dt>
          <dd className="text-ink">{customer.email}</dd>
        </div>
        <div className="flex gap-3">
          <dt>Registered</dt>
          <dd className="text-ink">{formatDate(customer.joined_at)}</dd>
        </div>
        <div className="flex gap-3">
          <dt>Orders</dt>
          <dd className="text-ink">{customer.orders_count}</dd>
        </div>
      </dl>

      <h2 className="mt-10 mb-4 text-[11px] tracking-widest text-graphite uppercase">Order History</h2>
      <OrderTable orders={orders.data} showCustomer={false} emptyText="この会員の注文はまだありません。" />
      <Pagination
        currentPage={orders.meta.current_page}
        lastPage={orders.meta.last_page}
        hrefFor={(target) => (target > 1 ? `/admin/customers/${id}?page=${target}` : `/admin/customers/${id}`)}
      />
    </div>
  );
}
