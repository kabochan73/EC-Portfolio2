import type { Metadata } from "next";
import Link from "next/link";

import OrderList from "@/components/account/OrderList";
import { requireAuth } from "@/lib/auth";
import { getMyOrders } from "@/lib/orders";

export const metadata: Metadata = { title: "Orders" };

export default async function OrdersPage() {
  const { token } = await requireAuth("/account/orders");
  const orders = await getMyOrders(token);

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <nav className="mb-8 text-[11px] tracking-widest text-graphite uppercase">
        <Link href="/account" className="hover:text-ink">
          Account
        </Link>
        <span className="mx-2">/</span>
        <span>Orders</span>
      </nav>

      <h1 className="mb-8 text-2xl font-medium tracking-[0.15em] uppercase">Orders</h1>
      <OrderList orders={orders} />
    </div>
  );
}
