"use client";

import { useRef, useState } from "react";

import type { ContentKey } from "@/lib/types";

type Props = {
  /** 保存先のフォルダ（content/{key}/...） */
  contentKey: ContentKey;
  value: string | null;
  /** アップロードできたら url、Remove なら null。data に入るのはセクションの保存のとき */
  onChange: (url: string | null) => void;
  label: string;
};

/** CMS の画像 1 枚のアップロード + プレビュー + 取り外し */
export default function ContentImageUpload({ contentKey, value, onChange, label }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append("image", file);

    const res = await fetch(`/bff/admin/content/${contentKey}/images`, { method: "POST", body: formData });
    setUploading(false);
    if (inputRef.current) inputRef.current.value = ""; // 同じファイルをもう一度選べるように

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.message ?? "アップロードできませんでした。");
      return;
    }
    const body: { url: string } = await res.json();
    onChange(body.url);
  }

  return (
    <div>
      <p className="text-[11px] tracking-widest text-graphite uppercase">{label}</p>
      {value && (
        // eslint-disable-next-line @next/next/no-img-element -- 管理画面のプレビューだけ
        <img src={value} alt="" className="mt-2 max-h-40 border border-mist bg-mist object-contain" />
      )}
      {error && <p className="mt-2 text-xs text-graphite">{error}</p>}
      <div className="mt-2 flex items-center gap-4">
        <label className="cursor-pointer border border-ink px-4 py-2 text-[11px] tracking-widest uppercase transition-colors hover:bg-mist">
          {uploading ? "..." : value ? "Replace" : "Upload"}
          <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} disabled={uploading} className="hidden" />
        </label>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-[11px] tracking-widest text-graphite uppercase underline underline-offset-2 hover:text-ink"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}
