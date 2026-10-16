import Image from "next/image";

import ProductMedia from "@/components/product/ProductMedia";
import type { ProductImage } from "@/lib/types";

/**
 * 商品詳細の画像ギャラリー（docs/01-sitemap-pages.md）。全画像を縦積み。
 * モバイルは横スワイプ（overflow-x-auto + snap）、PC は縦積み。
 * 画像が無ければ ProductMedia の NO IMAGE を1枚出す。
 */
export default function Gallery({ images, name }: { images: ProductImage[]; name: string }) {
  const sorted = [...images].sort((a, b) => a.position - b.position);

  if (sorted.length === 0) {
    return <ProductMedia images={[]} name={name} sizes="(min-width: 768px) 50vw, 100vw" />;
  }

  return (
    <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto md:flex-col md:gap-4 md:overflow-visible">
      {sorted.map((image) => (
        <div
          key={image.id}
          className="relative aspect-3/4 w-full flex-none snap-center overflow-hidden bg-mist md:aspect-auto md:h-auto"
        >
          <Image
            src={image.url}
            alt={image.alt ?? name}
            width={800}
            height={1067}
            sizes="(min-width: 768px) 50vw, 100vw"
            className="h-full w-full object-cover md:h-auto"
          />
        </div>
      ))}
    </div>
  );
}
