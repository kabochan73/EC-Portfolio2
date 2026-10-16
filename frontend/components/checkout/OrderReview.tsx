import Image from "next/image";

import AmountSummary from "@/components/order/AmountSummary";
import { type CartTotals, currentUnitPrice, lineProblem } from "@/lib/cart-summary";
import { formatYen } from "@/lib/format";
import type { CartItem } from "@/lib/stores/cart";
import type { CartLineValidation } from "@/lib/types";

type Props = {
  items: CartItem[];
  getValidation: (item: CartItem) => CartLineValidation;
  totals: CartTotals;
};

/**
 * チェックアウトの注文内容（読み取り専用）。数量変更はカートに戻って行う。
 * 「この行は買えない」の判定はカートと同じ lineProblem（R4。R3 は販売終了・売り切れしか見ておらず、
 * 在庫を超えた数量を見落としていた）。
 */
export default function OrderReview({ items, getValidation, totals }: Props) {
  return (
    <div className="border border-ink p-6">
      <h2 className="mb-6 text-[11px] tracking-widest text-graphite uppercase">Order</h2>

      <ul className="divide-y divide-mist border-y border-mist">
        {items.map((item) => {
          const validation = getValidation(item);
          const problem = lineProblem(item, validation);

          return (
            <li key={item.variantId} className="flex gap-3 py-4">
              <div className="relative aspect-3/4 w-14 flex-none overflow-hidden bg-mist">
                {item.imageUrl ? (
                  <Image src={item.imageUrl} alt={item.productName} fill sizes="3.5rem" className="object-cover" />
                ) : (
                  <span className="flex h-full items-center justify-center text-[7px] tracking-widest text-graphite uppercase">
                    No Image
                  </span>
                )}
              </div>
              <div className="flex flex-1 flex-col">
                <p className="text-xs">{item.productName}</p>
                <p className="mt-1 text-[10px] tracking-widest text-graphite uppercase">
                  {item.size}
                  {item.color ? ` / ${item.color}` : ""} × {item.quantity}
                </p>
                {problem && (
                  <p className="mt-1 text-[10px] tracking-widest text-ink uppercase">
                    {problem.kind === "over_stock" ? `在庫は ${problem.max} 点までです` : "現在購入できません"}
                  </p>
                )}
              </div>
              <p className="text-xs">{formatYen(currentUnitPrice(item, validation) * item.quantity)}</p>
            </li>
          );
        })}
      </ul>

      <div className="mt-6">
        <AmountSummary subtotal={totals.subtotal} shipping={totals.shipping} total={totals.total} />
      </div>
    </div>
  );
}
