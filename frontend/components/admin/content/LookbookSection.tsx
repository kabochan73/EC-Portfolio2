"use client";

import { useState } from "react";

import ContentImageUpload from "@/components/admin/content/ContentImageUpload";
import ContentSaveBar from "@/components/admin/content/ContentSaveBar";
import { moveItem } from "@/lib/array";
import { useContentSave } from "@/lib/hooks/useContentSave";
import { lookbookSchema } from "@/lib/schemas/adminContent";
import type { SiteContent } from "@/lib/types";

type LookbookImage = SiteContent["lookbook"]["images"][number];

const MAX_IMAGES = 12;

/**
 * トップの Lookbook（画像の追加・alt・▲▼・取り外し。保存するまでトップには出ない）。
 * R4: key は画像の url（アップロードごとに ULID のファイル名なので重ならない）。
 * R3 は配列の番号を key にしていたので、並べ替えると React が行の対応を取り違えることがあった
 */
export default function LookbookSection({ initial }: { initial: SiteContent["lookbook"] }) {
  const [images, setImages] = useState<LookbookImage[]>(initial.images);
  const { save, ...status } = useContentSave("lookbook", lookbookSchema);

  function update(index: number, patch: Partial<LookbookImage>) {
    setImages((prev) => prev.map((img, i) => (i === index ? { ...img, ...patch } : img)));
  }

  return (
    <div className="space-y-6">
      {images.length === 0 && <p className="text-xs text-graphite">画像はまだありません。</p>}

      <ul className="space-y-4">
        {images.map((image, index) => (
          <li key={image.url} className="flex gap-4 border border-mist p-4">
            {/* eslint-disable-next-line @next/next/no-img-element -- 管理画面のプレビューだけ */}
            <img src={image.url} alt="" className="h-24 w-20 flex-none bg-mist object-cover" />
            <div className="flex-1 space-y-2">
              <input
                value={image.alt}
                placeholder="alt テキスト"
                aria-label={`画像 ${index + 1} の alt`}
                onChange={(e) => update(index, { alt: e.target.value })}
                className="w-full border-b border-ink bg-transparent py-1 text-sm outline-none"
              />
              <div className="flex gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => setImages((prev) => moveItem(prev, index, -1))}
                  disabled={index === 0}
                  className="disabled:opacity-30"
                  aria-label="前へ"
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => setImages((prev) => moveItem(prev, index, 1))}
                  disabled={index === images.length - 1}
                  className="disabled:opacity-30"
                  aria-label="後ろへ"
                >
                  ▼
                </button>
                <button
                  type="button"
                  onClick={() => setImages((prev) => prev.filter((_, i) => i !== index))}
                  className="tracking-widest text-graphite uppercase underline underline-offset-2 hover:text-ink"
                >
                  Remove
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {images.length < MAX_IMAGES && (
        <ContentImageUpload
          contentKey="lookbook"
          value={null}
          onChange={(url) => url && setImages((prev) => [...prev, { url, alt: "" }])}
          label="画像を追加"
        />
      )}

      <ContentSaveBar label="Save Lookbook" {...status} onSave={() => save({ images })} />
    </div>
  );
}
