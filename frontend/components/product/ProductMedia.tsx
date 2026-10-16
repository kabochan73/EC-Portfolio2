import Image from "next/image";

import type { ProductImage } from "@/lib/types";

type ProductMediaProps = {
  images: ProductImage[];
  /** カード用に true でホバー時 2枚目に差し替える（詳細ページのギャラリーでは使わない） */
  hoverSwap?: boolean;
  /** 商品名（alt 未設定時のフォールバック） */
  name: string;
  sizes?: string;
};

/**
 * 商品画像の表示。画像が1枚も無ければ「NO IMAGE」のグレーボックス（docs/08 §10）。
 * 実体配信は app/media/[...key]/route.ts のプロキシ経由（同一オリジンなので next/image
 * デフォルト loader でそのまま最適化される）。
 */
export default function ProductMedia({ images, hoverSwap = false, name, sizes }: ProductMediaProps) {
  const primary = images.find((image) => image.position === 0) ?? images[0];
  const hover = hoverSwap ? images.find((image) => image.position === 1) : undefined;

  return (
    <div className="relative aspect-3/4 overflow-hidden bg-mist">
      {primary ? (
        <>
          <Image
            src={primary.url}
            alt={primary.alt ?? name}
            fill
            sizes={sizes}
            className={
              hover
                ? "object-cover transition-opacity duration-300 group-hover:opacity-0"
                : "object-cover"
            }
          />
          {hover && (
            <Image
              src={hover.url}
              alt={hover.alt ?? name}
              fill
              sizes={sizes}
              className="object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            />
          )}
        </>
      ) : (
        <div className="flex h-full items-center justify-center">
          <span className="text-[10px] tracking-[0.3em] text-graphite uppercase">No Image</span>
        </div>
      )}
    </div>
  );
}
