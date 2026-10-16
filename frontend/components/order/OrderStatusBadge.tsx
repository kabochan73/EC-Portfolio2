import type { OrderStatus } from "@/lib/types";

const LABEL: Record<OrderStatus, string> = {
  pending: "PENDING",
  paid: "PAID",
  shipped: "SHIPPED",
  completed: "COMPLETED",
  cancelled: "CANCELLED",
};

/** 注文ステータスのラベル。色は使わず文字だけ（モノトーン）。 */
export default function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-block border px-2 py-1 text-[10px] tracking-widest uppercase ${
        status === "cancelled" ? "border-graphite text-graphite" : "border-ink text-ink"
      }`}
    >
      {LABEL[status]}
    </span>
  );
}
