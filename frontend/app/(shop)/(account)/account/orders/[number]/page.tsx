import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import OrderStatusBadge from "@/components/order/OrderStatusBadge";
import ShippingAddress from "@/components/order/ShippingAddress";
import { requireAuth } from "@/lib/auth";
import { formatDateTime, formatYen } from "@/lib/format";
import { getMyOrder } from "@/lib/orders";

type PageProps = { params: Promise<{ number: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { number } = await params;
  return { title: `Order ${number}` };
}

/**
 * 注文詳細（Server Component）。他人の注文・存在しない番号は notFound()（Laravel が 404 を返す）。
 * (account) 配下には loading.tsx を置かない（置くと notFound() でも 200 になる。Step 34 と同じ理由）。
 */
export default async function OrderDetailPage({ params }: PageProps) {
  const { number } = await params;
  const { token } = await requireAuth(`/account/orders/${number}`);
  const order = await getMyOrder(token, number);

  if (!order) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <nav className="mb-8 text-[11px] tracking-widest text-graphite uppercase">
        <Link href="/account/orders" className="hover:text-ink">
          Orders
        </Link>
        <span className="mx-2">/</span>
        <span>{order.order_number}</span>
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-medium tracking-[0.15em] uppercase">{order.order_number}</h1>
        <OrderStatusBadge status={order.status} />
      </div>
      <p className="mt-2 text-[11px] tracking-widest text-graphite uppercase">
        {formatDateTime(order.placed_at)}
      </p>

      {order.status === "pending" && (
        <Link
          href={`/checkout/payment?order=${order.order_number}`}
          className="mt-6 inline-block bg-ink px-6 py-3 text-xs tracking-widest text-paper uppercase transition-opacity hover:opacity-80"
        >
          Complete Payment
        </Link>
      )}
      {order.payment?.last_error && order.status === "pending" && (
        <p className="mt-4 text-xs text-graphite">直近の決済エラー: {order.payment.last_error}</p>
      )}

      <section className="mt-12 border-t border-ink">
        {order.items.map((item) => (
          <div key={item.id} className="flex justify-between border-b border-mist py-4 text-sm">
            <div>
              <p>{item.product_name}</p>
              <p className="mt-1 text-[11px] tracking-widest text-graphite uppercase">
                {item.size}
                {item.color ? ` / ${item.color}` : ""} × {item.quantity}
              </p>
            </div>
            <p>{formatYen(item.line_total)}</p>
          </div>
        ))}
      </section>

      <dl className="mt-6 space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="tracking-widest text-graphite uppercase">Subtotal</dt>
          <dd>{formatYen(order.subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="tracking-widest text-graphite uppercase">Shipping</dt>
          <dd>{order.shipping_fee === 0 ? "FREE" : formatYen(order.shipping_fee)}</dd>
        </div>
        <div className="flex justify-between border-t border-ink pt-2 text-base">
          <dt className="tracking-widest uppercase">Total</dt>
          <dd>{formatYen(order.total)}</dd>
        </div>
      </dl>

      <section className="mt-12 border-t border-ink pt-6">
        <h2 className="mb-3 text-[11px] tracking-widest text-graphite uppercase">Shipping Address</h2>
        <ShippingAddress address={order.shipping_address} />
      </section>
    </div>
  );
}
