import { formatYen } from "@/lib/format";
import type { CategoryRanking } from "@/lib/types";

/** 前月比の表示。先月 0 個なら比べられないので「—」 */
function formatRatio(ratio: number | null): string {
  return ratio === null ? "—" : `${Math.round(ratio * 100)}%`;
}

/**
 * カテゴリ別の商品ランキング（今月。Server Component）。
 * 並び順は API が決める（販売個数 → 同数なら売上）。カテゴリの全商品を出す（TOP N で切らない。docs/05）
 */
export default function SalesRanking({ ranking }: { ranking: CategoryRanking[] }) {
  return (
    <div className="space-y-10">
      {ranking.map(({ category, products }) => (
        <section key={category.id}>
          <h3 className="mb-3 text-xs tracking-widest uppercase">{category.name}</h3>
          {products.length === 0 ? (
            <p className="text-sm text-graphite">商品がありません。</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-ink text-left text-[11px] tracking-widest text-graphite uppercase">
                    <th className="w-10 py-2 pr-4 font-normal">#</th>
                    <th className="py-2 pr-4 font-normal">Product</th>
                    <th className="py-2 pr-4 text-right font-normal">Qty</th>
                    <th className="py-2 pr-4 text-right font-normal">Revenue</th>
                    <th className="py-2 pr-4 text-right font-normal">Last Month</th>
                    <th className="py-2 text-right font-normal">MoM</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product, index) => (
                    <tr key={product.id} className={`border-b border-mist ${product.quantity === 0 ? "text-graphite" : ""}`}>
                      <td className="py-2 pr-4">{index + 1}</td>
                      <td className="py-2 pr-4">{product.name}</td>
                      <td className="py-2 pr-4 text-right">{product.quantity}</td>
                      <td className="py-2 pr-4 text-right">{formatYen(product.revenue)}</td>
                      <td className="py-2 pr-4 text-right">{product.last_month_quantity}</td>
                      <td className="py-2 text-right">{formatRatio(product.mom_ratio)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
