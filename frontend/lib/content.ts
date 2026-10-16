import { apiFetch } from "@/lib/api";
import { revalidateSeconds, tags } from "@/lib/revalidate";
import type { ApiResource, SiteContent } from "@/lib/types";

/**
 * トップページの CMS コンテンツ（docs/11-cms.md）。GET /api/content。
 * 4 キーは必ず埋まって返ってくる（未設定はデフォルト）。
 * ISR: タグ content。管理画面の CMS 保存で revalidate される。
 */
export async function getContent(): Promise<SiteContent> {
  const res = await apiFetch<ApiResource<SiteContent>>("/api/content", {
    next: { tags: [tags.content], revalidate: revalidateSeconds.content },
  });

  return res.data;
}
