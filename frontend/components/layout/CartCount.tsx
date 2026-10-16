"use client";

import Link from "next/link";

import { useCartItemCount } from "@/lib/stores/cart";

/**
 * ヘッダーの Cart (n) リンク。zustand ストアの数量合計を表示する。
 * 復元前（SSR・hydration 直後）は 0。CartHydration が復元するとこの値も更新される。
 */
export default function CartCount() {
  const count = useCartItemCount();

  return (
    <Link href="/cart" className="transition-opacity hover:opacity-60">
      Cart ({count})
    </Link>
  );
}
