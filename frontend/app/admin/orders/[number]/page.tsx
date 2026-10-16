import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import OrderStatusActions from "@/components/admin/OrderStatusActions";
import AmountSummary from "@/components/order/AmountSummary";
import OrderStatusBadge from "@/components/order/OrderStatusBadge";
import ShippingAddress from "@/components/order/ShippingAddress";
import { fetchAdminOrder } from "@/lib/admin/orders";
import { ApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { formatDateTime, formatYen } from "@/lib/format";
import type { AdminOrderDetail } from "@/lib/types";

type PageProps = { params: Promise<{ number: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { number } = await params;
  return { title: `Order ${number}` };
}

const headingClass = "mb-3 text-[11px] tracking-widest text-graphite uppercase";

/**
 * 注文詳細（Server Component）。ステータスのボタンだけが CC（OrderStatusActions）。
 * R4: 配送先・金額・バッジはストア側の部品を使い（R3 はページ内に書き直していた）、
 * 日時は formatDateTime で日本時間にする（R3 は toLocaleString で、サーバーの UTC のまま 9 時間ずれていた）
 */
export default async function AdminOrderDetailPage({ params }: PageProps) {
  const { number } = await params;
  const { token } = await requireAdmin(`/admin/orders/${number}`);

  let order: AdminOrderDetail;
  try {
    order = await fetchAdminOrder(token, number);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  const timeline: [string, string | null][] = [
    ["Placed", order.placed_at],
    ["Paid", order.paid_at],
    ["Shipped", order.shipped_at],
    ["Cancelled", order.cancelled_at],
  ];

  return (
    <div className="max-w-3xl">
      <nav className="mb-6 text-[11px] tracking-widest text-graphite uppercase">
        <Link href="/admin/orders" className="hover:text-ink">
          Orders
        </Link>
        <span className="mx-2">/</span>
        <span>{order.order_number}</span>
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl tracking-widest uppercase">{order.order_number}</h1>
        <OrderStatusBadge status={order.status} />
      </div>

      <section className="mt-8 border border-ink p-6">
        <h2 className="mb-4 text-[11px] tracking-widest text-graphite uppercase">Fulfillment</h2>
        <OrderStatusActions orderNumber={order.order_number} status={order.status} />
      </section>

      <div className="mt-8 grid gap-8 sm:grid-cols-2">
        <section>
          <h2 className={headingClass}>Customer</h2>
          {order.customer.id ? (
            <Link href={`/admin/customers/${order.customer.id}`} className="text-sm leading-relaxed hover:underline">
              {order.customer.name}
              <br />
              <span className="text-graphite">{order.customer.email}</span>
            </Link>
          ) : (
            <p className="text-sm text-graphite">退会したユーザー</p>
          )}
        </section>

        <section>
          <h2 className={headingClass}>Timeline</h2>
          <dl className="space-y-1 text-sm">
            {timeline.map(([label, iso]) => (
              <div key={label} className="flex justify-between gap-4">
                <dt className="text-graphite">{label}</dt>
                <dd>{formatDateTime(iso)}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section>
          <h2 className={headingClass}>Shipping Address</h2>
          <ShippingAddress address={order.shipping_address} />
        </section>

        <section>
          <h2 className={headingClass}>Payment</h2>
          {order.payment ? (
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-graphite">Status</dt>
                <dd className="tracking-widest uppercase">{order.payment.status}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-graphite">Intent</dt>
                <dd className="truncate">{order.payment.stripe_payment_intent_id ?? "—"}</dd>
              </div>
              {order.payment.refunded_at && (
                <div className="flex justify-between gap-4">
                  <dt className="text-graphite">Refunded</dt>
                  <dd>{formatDateTime(order.payment.refunded_at)}</dd>
                </div>
              )}
              {order.payment.last_error && <p className="mt-2 text-xs text-graphite">{order.payment.last_error}</p>}
            </dl>
          ) : (
            <p className="text-sm text-graphite">未決済</p>
          )}
        </section>
      </div>

      <section className="mt-10 border-t border-ink">
        {order.items.map((item) => (
          <div key={item.id} className="flex justify-between gap-4 border-b border-mist py-4 text-sm">
            <div>
              <p>{item.product_name}</p>
              <p className="mt-1 text-[11px] tracking-widest text-graphite uppercase">
                {item.size}
                {item.color ? ` / ${item.color}` : ""} × {item.quantity}
              </p>
            </div>
            <p className="whitespace-nowrap">{formatYen(item.line_total)}</p>
          </div>
        ))}
      </section>

      <div className="mt-6">
        <AmountSummary subtotal={order.subtotal} shipping={order.shipping_fee} total={order.total} />
      </div>
    </div>
  );
}
