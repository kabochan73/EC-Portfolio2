"use client";

import { useState } from "react";
import type { ZodType } from "zod";

import type { ContentKey, SiteContent } from "@/lib/types";

/**
 * CMS の 1 セクションを保存する（zod で確かめる → PUT /bff/admin/content/{key} → 結果を出す）。
 * R4: R3 は Hero / Concept / Lookbook / About の 4 つに同じ 25 行の save() を書いていた。
 * 各セクションは「今の入力」を save() に渡すだけにした
 */
export function useContentSave<K extends ContentKey>(key: K, schema: ZodType<SiteContent[K]>) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function save(input: unknown) {
    setError(null);
    setNotice(null);

    const parsed = schema.safeParse(input);
    if (!parsed.success) {
      // 入力欄がセクションごとに形が違う（配列もある）ので、最初の 1 つだけを下にまとめて出す
      setError(parsed.error.issues[0]?.message ?? "入力を確認してください。");
      return;
    }

    setSaving(true);
    const res = await fetch(`/bff/admin/content/${key}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });
    setSaving(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.message ?? "保存できませんでした。");
      return;
    }
    setNotice("保存しました。トップページに反映されています。");
  }

  return { save, saving, error, notice };
}
