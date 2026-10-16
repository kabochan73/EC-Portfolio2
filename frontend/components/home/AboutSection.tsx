import Image from "next/image";

import type { SiteContent } from "@/lib/types";

/**
 * 旧 /about を統合したセクション（docs/01-sitemap-pages.md）。
 * BrandConcept が「理念」を担当するので、ここは「沿革・素材・製造背景」に絞る。
 * CMS の about.blocks 駆動。偶数番は画像左、奇数番は画像右の交互レイアウト。
 * 画像 null は bg-mist のプレースホルダ。
 */
export default function AboutSection({ blocks }: { blocks: SiteContent["about"]["blocks"] }) {
  if (blocks.length === 0) return null;

  return (
    <section className="border-t border-ink px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center text-2xl font-medium tracking-[0.15em] uppercase">About</h2>

        <div className="mt-16 flex flex-col gap-20">
          {blocks.map((block, i) => {
            const imageRight = i % 2 === 1;
            return (
              <div key={i} className="grid gap-12 md:grid-cols-2 md:items-center">
                <div
                  className={`relative aspect-4/3 overflow-hidden bg-mist ${
                    imageRight ? "md:order-2" : ""
                  }`}
                >
                  {block.image_url && (
                    <Image
                      src={block.image_url}
                      alt=""
                      fill
                      sizes="(min-width: 768px) 40vw, 100vw"
                      className="object-cover"
                    />
                  )}
                </div>
                <div className={imageRight ? "md:order-1" : ""}>
                  <p className="text-[11px] tracking-widest text-graphite uppercase">
                    {block.label}
                  </p>
                  {block.heading && (
                    <p className="mt-2 text-lg tracking-wide">{block.heading}</p>
                  )}
                  <p className="mt-4 text-sm leading-loose text-graphite">{block.body}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
