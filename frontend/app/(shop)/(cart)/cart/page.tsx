import type { Metadata } from "next";

import CartView from "@/components/cart/CartView";

export const metadata: Metadata = { title: "Cart" };

/**
 * カートページ（Server Component）。中身は localStorage にあるので CartView（CC）に任せ、
 * ここは見出しと metadata だけ（docs/08 §3.6。R3 はこのファイル自体が "use client" だった）。
 */
export default function CartPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="mb-8 text-2xl font-medium tracking-[0.15em] uppercase">Cart</h1>
      <CartView />
    </div>
  );
}
