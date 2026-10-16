"use client";

import { useEffect } from "react";

import { useCartStore } from "@/lib/stores/cart";

/**
 * カートストアの復元を、マウント後（クライアントでの hydration 完了後）に明示的に行う。
 * app/layout.tsx に1回だけ置く（何も描画しない）。
 */
export default function CartHydration() {
  useEffect(() => {
    useCartStore.persist.rehydrate();
  }, []);

  return null;
}
