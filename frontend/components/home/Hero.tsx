import Image from "next/image";

import type { SiteContent } from "@/lib/types";

/**
 * フルスクリーンのヒーロー（docs/01-sitemap-pages.md）。CMS の hero コンテンツ駆動。
 * 画像なしは bg-ink の単色背景。ヘッダーは常に不透明固定なので
 * (shop)/layout.tsx の main の pt-16 の下から始まる。
 * 高さは「画面 − ヘッダー（4rem = 64px）」で、最初の表示にちょうど収める（R4。R3 は h-screen で
 * ヘッダー分はみ出していた）。100svh はスマホのアドレスバーが出ている状態の高さ */
export default function Hero({ hero }: { hero: SiteContent["hero"] }) {
  return (
    <section className="relative flex h-[calc(100svh-4rem)] items-center justify-center overflow-hidden bg-ink text-paper">
      {hero.image_url && (
        <Image
          src={hero.image_url}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-70"
        />
      )}
      <div className="relative text-center">
        <p className="text-xs tracking-[0.3em] uppercase sm:text-sm">
          {hero.headline || "EC-PORTFOLIO"}
        </p>
        {hero.tagline && (
          <p className="mt-4 text-[11px] tracking-[0.2em] uppercase opacity-80">
            {hero.tagline}
          </p>
        )}
      </div>
    </section>
  );
}
