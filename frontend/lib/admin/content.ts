// 管理画面の CMS（サーバー専用。Server Component / BFF から）。docs/11-cms.md

import { apiFetch, bearer, bearerJson } from "@/lib/api";
import type { ApiResource, ContentKey, SiteContent } from "@/lib/types";

/** GET /api/admin/content … 4 つのキーの data（未設定のキーは既定値で埋まる） */
export async function fetchAdminContent(token: string): Promise<SiteContent> {
  const result = await apiFetch<ApiResource<SiteContent>>("/api/admin/content", { headers: bearer(token) });
  return result.data;
}

/** PUT /api/admin/content/{key} … そのキーの data を丸ごと差し替える */
export async function updateContent<K extends ContentKey>(
  token: string,
  key: K,
  data: SiteContent[K],
): Promise<SiteContent[K]> {
  const result = await apiFetch<ApiResource<SiteContent[K]>>(
    `/api/admin/content/${key}`,
    bearerJson(token, "PUT", data),
  );
  return result.data;
}

/** POST /api/admin/content/{key}/images … バケットに保存して /media/content/{key}/... の url を返す */
export async function uploadContentImage(token: string, key: ContentKey, file: File): Promise<string> {
  const formData = new FormData();
  formData.append("image", file);

  // Content-Type は付けない（FormData を渡すと fetch が boundary 込みで付ける）
  const result = await apiFetch<{ url: string }>(`/api/admin/content/${key}/images`, {
    method: "POST",
    headers: bearer(token),
    body: formData,
  });
  return result.url;
}
