import Link from "next/link";

import OrderStatusBadge from "@/components/order/OrderStatusBadge";
import { formatDate, formatYen } from "@/lib/format";
import type { AdminOrderListItem } from "@/lib/types";

type Props = {
  orders: AdminOrderListItem[];
  /** 顧客詳細ページでは全行が同一人物なので Customer 列を隠す */
  showCustomer?: boolean;
  emptyText?: string;
};

/**
 * 管理向けの注文一覧の表（ダッシュボードの未発送の注文・/admin/orders・/admin/customers/[id] で共用）。
 * R4 は最初からこの部品として作る（R3 はダッシュボードに別の表を書き、後から共通化していた）。
 */
export default function OrderTable({ orders, showCustomer = true, emptyText = "No orders found." }: Props) {
  if (orders.length === 0) {
    return <p className="text-sm text-graphite">{emptyText}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-ink text-left text-[11px] tracking-widest text-graphite uppercase">
            <th className="py-2 pr-4 font-normal">Order</th>
            {showCustomer && <th className="py-2 pr-4 font-normal">Customer</th>}
            <th className="py-2 pr-4 font-normal">Date</th>
            <th className="py-2 pr-4 font-normal">Items</th>
            <th className="py-2 pr-4 font-normal">Status</th>
            <th className="py-2 text-right font-normal">Total</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.order_number} className="border-b border-mist">
              <td className="py-3 pr-4">
                <Link href={`/admin/orders/${order.order_number}`} className="tracking-wide hover:underline">
                  {order.order_number}
                </Link>
              </td>
              {showCustomer && <td className="py-3 pr-4">{order.customer.name ?? "—"}</td>}
              <td className="py-3 pr-4 text-graphite">{formatDate(order.placed_at)}</td>
              <td className="py-3 pr-4 text-graphite">{order.item_count}</td>
              <td className="py-3 pr-4">
                <OrderStatusBadge status={order.status} />
              </td>
              <td className="py-3 text-right">{formatYen(order.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
