import Link from "next/link";

import ProductMedia from "@/components/product/ProductMedia";
import { formatYen } from "@/lib/format";
import type { ProductSummary } from "@/lib/types";

const STOCK_LABEL: Partial<Record<ProductSummary["stock_status"], string>> = {
  sold_out: "SOLD OUT",
  low_stock: "LOW STOCK",
  // in_stock は何も表示しない（docs/01-sitemap-pages.md）
};

/**
 * 商品カード。トップのカテゴリグリッド・商品詳細の "YOU MAY ALSO LIKE" で共通。
 * データ取得を持たない純粋な表示コンポーネント（SC / CC どちらからでも使える）。
 * 画像ホバー切替（position 0→1）は ProductMedia の group-hover（JS 不要）。
 */
export default function ProductCard({ product }: { product: ProductSummary }) {
  const stockLabel = STOCK_LABEL[product.stock_status];

  return (
    <Link href={`/products/${product.slug}`} className="group block">
      <div className="relative">
        <ProductMedia
          images={product.images}
          hoverSwap
          name={product.name}
          sizes="(min-width: 768px) 25vw, 50vw"
        />

        {/* 左上バッジ: NEW と 在庫バッジ は同時に出うる */}
        <div className="absolute top-2 left-2 flex flex-col items-start gap-1">
          {product.is_new && (
            <span className="bg-ink px-2 py-1 text-[10px] tracking-widest text-paper uppercase">
              New
            </span>
          )}
          {stockLabel && (
            <span className="border border-ink bg-paper px-2 py-1 text-[10px] tracking-widest text-ink uppercase">
              {stockLabel}
            </span>
          )}
        </div>
      </div>

      <p className="mt-3 text-[11px] tracking-widest text-graphite uppercase">
        {product.category.name}
      </p>
      <p className="mt-1 line-clamp-2 text-sm">{product.name}</p>
      <p className="mt-1 text-sm">{formatYen(product.price)}</p>
    </Link>
  );
}
