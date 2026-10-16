import Link from "next/link";

import AmountSummary from "@/components/order/AmountSummary";
import type { CartTotals } from "@/lib/cart-summary";
import { formatYen } from "@/lib/format";

/**
 * 小計・送料・合計と CHECKOUT ボタン。計算はしない（lib/cart-summary.ts の summarizeCart の結果を
 * 表示するだけ。R4。R3 はここでも送料と合計を計算し直していた）。
 * 状態もフックも持たないので "use client" は不要（CartView から使われるのでブラウザでも動く）。
 */
export default function CartSummary({ totals }: { totals: CartTotals }) {
  return (
    <div className="border border-ink p-6">
      <AmountSummary subtotal={totals.subtotal} shipping={totals.shipping} total={totals.total} />

      {totals.blocked ? (
        <p className="mt-6 block w-full bg-mist py-3 text-center text-xs tracking-widest text-graphite uppercase">
          購入できない明細があります
        </p>
      ) : (
        <Link
          href="/checkout"
          className="mt-6 block w-full bg-ink py-3 text-center text-xs tracking-widest text-paper uppercase transition-opacity hover:opacity-80"
        >
          Checkout
        </Link>
      )}

      {totals.untilFreeShipping > 0 && (
        <p className="mt-3 text-[11px] tracking-widest text-graphite uppercase">
          あと {formatYen(totals.untilFreeShipping)} で送料無料
        </p>
      )}
    </div>
  );
}
