import { formatYen } from "@/lib/format";

type Props = {
  subtotal: number;
  shipping: number;
  total: number;
};

/**
 * 小計・送料・合計の表（R4 で部品化）。カート・チェックアウト・マイページの注文詳細・管理画面の注文詳細で使う
 * （R3 は同じ <dl> を 3 か所以上に書いていた）。計算はしない（呼び出し側が計算済みの値を渡す）。
 */
export default function AmountSummary({ subtotal, shipping, total }: Props) {
  return (
    <dl className="space-y-3 text-sm">
      <div className="flex justify-between">
        <dt className="tracking-widest text-graphite uppercase">Subtotal</dt>
        <dd>{formatYen(subtotal)}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="tracking-widest text-graphite uppercase">Shipping</dt>
        <dd>{shipping === 0 ? "FREE" : formatYen(shipping)}</dd>
      </div>
      <div className="flex justify-between border-t border-ink pt-3 text-base">
        <dt className="tracking-widest uppercase">Total</dt>
        <dd>{formatYen(total)}</dd>
      </div>
    </dl>
  );
}
