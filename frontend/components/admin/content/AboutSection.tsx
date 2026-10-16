"use client";

import { useState } from "react";

import ContentImageUpload from "@/components/admin/content/ContentImageUpload";
import ContentSaveBar from "@/components/admin/content/ContentSaveBar";
import Field from "@/components/ui/Field";
import { moveItem } from "@/lib/array";
import { useContentSave } from "@/lib/hooks/useContentSave";
import { aboutSchema } from "@/lib/schemas/adminContent";
import type { SiteContent } from "@/lib/types";

type AboutBlock = SiteContent["about"]["blocks"][number];

const EMPTY_BLOCK: AboutBlock = { label: "", heading: "", body: "", image_url: null };
const MAX_BLOCKS = 6;

/**
 * トップの About（ブロックの追加・▲▼・取り外し。各ブロックは label / heading / body / 画像 1 枚）。
 * ブロックには id が無いので key は配列の番号。入力はすべて state から描く（制御された input）ので、
 * 並べ替えても値は正しく入れ替わる
 */
export default function AboutSection({ initial }: { initial: SiteContent["about"] }) {
  const [blocks, setBlocks] = useState<AboutBlock[]>(initial.blocks);
  const { save, ...status } = useContentSave("about", aboutSchema);

  function update(index: number, patch: Partial<AboutBlock>) {
    setBlocks((prev) => prev.map((b, i) => (i === index ? { ...b, ...patch } : b)));
  }

  return (
    <div className="space-y-8">
      {blocks.map((block, index) => (
        <div key={index} className="space-y-4 border border-mist p-4">
          <div className="flex justify-between text-xs">
            <span className="tracking-widest text-graphite uppercase">Block {index + 1}</span>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setBlocks((prev) => moveItem(prev, index, -1))}
                disabled={index === 0}
                className="disabled:opacity-30"
                aria-label="前へ"
              >
                ▲
              </button>
              <button
                type="button"
                onClick={() => setBlocks((prev) => moveItem(prev, index, 1))}
                disabled={index === blocks.length - 1}
                className="disabled:opacity-30"
                aria-label="後ろへ"
              >
                ▼
              </button>
              <button
                type="button"
                onClick={() => setBlocks((prev) => prev.filter((_, i) => i !== index))}
                className="tracking-widest text-graphite uppercase underline underline-offset-2 hover:text-ink"
              >
                Remove
              </button>
            </div>
          </div>

          <Field
            label="Label"
            id={`about-label-${index}`}
            value={block.label}
            onChange={(e) => update(index, { label: e.target.value })}
          />
          <Field
            label="Heading"
            id={`about-heading-${index}`}
            value={block.heading}
            onChange={(e) => update(index, { heading: e.target.value })}
          />
          <div>
            <label htmlFor={`about-body-${index}`} className="block text-[11px] tracking-widest text-graphite uppercase">
              Body
            </label>
            <textarea
              id={`about-body-${index}`}
              rows={3}
              value={block.body}
              onChange={(e) => update(index, { body: e.target.value })}
              className="mt-2 w-full border border-ink bg-transparent p-2 text-sm outline-none"
            />
          </div>
          <ContentImageUpload
            contentKey="about"
            value={block.image_url}
            onChange={(url) => update(index, { image_url: url })}
            label="Image（任意）"
          />
        </div>
      ))}

      {blocks.length < MAX_BLOCKS && (
        <button
          type="button"
          onClick={() => setBlocks((prev) => [...prev, { ...EMPTY_BLOCK }])}
          className="border border-ink px-6 py-3 text-xs tracking-widest uppercase transition-colors hover:bg-mist"
        >
          Add Block
        </button>
      )}

      <ContentSaveBar label="Save About" {...status} onSave={() => save({ blocks })} />
    </div>
  );
}
