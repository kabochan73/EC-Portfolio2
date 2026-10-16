import Link from "next/link";

import OrderStatusBadge from "@/components/order/OrderStatusBadge";
import { formatDate, formatYen } from "@/lib/format";
import type { OrderListItem } from "@/lib/types";

export default function OrderList({ orders }: { orders: OrderListItem[] }) {
  if (orders.length === 0) {
    return <p className="text-sm text-graphite">まだ注文はありません。</p>;
  }

  return (
    <ul className="divide-y divide-mist border-t border-ink">
      {orders.map((order) => (
        <li key={order.order_number}>
          <Link
            href={`/account/orders/${order.order_number}`}
            className="flex flex-wrap items-center justify-between gap-3 py-5 transition-colors hover:bg-mist"
          >
            <div>
              <p className="text-sm">{order.order_number}</p>
              <p className="mt-1 text-[11px] tracking-widest text-graphite uppercase">
                {formatDate(order.placed_at)} · {order.item_count} 点
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm">{formatYen(order.total)}</span>
              <OrderStatusBadge status={order.status} />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
