import Image from "next/image";

import type { SiteContent } from "@/lib/types";

/**
 * ルックブックの横スクロール帯（docs/01-sitemap-pages.md: 画像のみ 5〜6枚）。
 * CMS の lookbook.images 駆動。0 枚なら何も出さない。
 */
export default function Lookbook({ images }: { images: SiteContent["lookbook"]["images"] }) {
  if (images.length === 0) return null;

  return (
    <section className="border-t border-ink py-20">
      <div className="flex gap-4 overflow-x-auto px-6 pb-2">
        {images.map((image, i) => (
          <div key={i} className="relative aspect-3/4 w-64 flex-none overflow-hidden bg-mist">
            <Image
              src={image.url}
              alt={image.alt || ""}
              fill
              sizes="16rem"
              className="object-cover"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
