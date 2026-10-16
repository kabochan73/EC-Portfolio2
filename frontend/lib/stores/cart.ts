// ─────────────────────────────────────────────────────────────
// カート状態。zustand + persist で localStorage に保存（サーバーには一切送らない）。
// ログイン状態と無関係にブラウザ単位で保持（docs/08 §5）。
//
// 持つのは「追加時点の表示スナップショット」。実在庫・価格は /cart・/checkout で
// GET /api/cart/validate により再検証する。確定金額は POST /api/orders でサーバーが
// 再計算するので、ここがズレても実害はない。
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

import { CART_MAX_QUANTITY_PER_LINE, CART_STORAGE_KEY } from "@/lib/constants";

/**
 * カートの 1 行。API のレスポンスではなく、このストアが持つ形なのでここで定義する
 * （docs/08 §7。lib/types/ は API と画面で共有する型だけ）。
 */
export type CartItem = {
  variantId: number;
  productSlug: string;
  productName: string;
  size: string;
  color: string | null;
  unitPrice: number;
  quantity: number;
  imageUrl: string | null;
};

type CartState = {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (variantId: number) => void;
  /** 0 以下で削除扱い（数量ステッパーで 0 まで下げたケース） */
  setQuantity: (variantId: number, quantity: number) => void;
  clear: () => void;
};

/**
 * 1 明細の数量を上限（backend の cart_max_quantity_per_line = 10）に収める（R4）。
 * R3 は ADD TO CART を押した回数だけ増え、11 個以上で注文すると 422 になっていた
 */
function clampQuantity(quantity: number): number {
  return Math.min(quantity, CART_MAX_QUANTITY_PER_LINE);
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],

      addItem: (item) =>
        set((state) => {
          const existing = state.items.find((i) => i.variantId === item.variantId);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.variantId === item.variantId
                  ? { ...i, quantity: clampQuantity(i.quantity + item.quantity) }
                  : i,
              ),
            };
          }
          return { items: [...state.items, { ...item, quantity: clampQuantity(item.quantity) }] };
        }),

      removeItem: (variantId) =>
        set((state) => ({
          items: state.items.filter((i) => i.variantId !== variantId),
        })),

      setQuantity: (variantId, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => i.variantId !== variantId)
              : state.items.map((i) =>
                  i.variantId === variantId ? { ...i, quantity: clampQuantity(quantity) } : i,
                ),
        })),

      clear: () => set({ items: [] }),
    }),
    {
      name: CART_STORAGE_KEY,
      // SSR は localStorage が無いので初回描画は必ず items:[]。自動復元だとクライアント初回
      // 描画がサーバーと食い違い hydration mismatch になるので、復元は明示的に
      // （マウント後に）行う（components/providers/CartHydration.tsx）。
      skipHydration: true,
    },
  ),
);

/** ヘッダーの CART (n) 用。数量合計（行数ではない）。 */
export function useCartItemCount(): number {
  return useCartStore((state) => state.items.reduce((sum, i) => sum + i.quantity, 0));
}

/**
 * localStorage からの復元が終わったか（R4）。復元前は items が必ず [] なので、
 * これを見ずに「空のカート」を出すと、中身があっても一瞬 Your cart is empty が見える（R3 の挙動）
 */
export function useCartHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(useCartStore.persist.hasHydrated());
    return useCartStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  return hydrated;
}
