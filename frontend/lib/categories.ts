import { apiFetch } from "@/lib/api";
import { revalidateSeconds, tags } from "@/lib/revalidate";
import type { ApiCollection, Category } from "@/lib/types";

/**
 * 公開カテゴリ一覧（position 順）。GET /api/categories。
 * ISR: タグ categories。管理側の並べ替え・追加・編集で revalidate される。
 */
export async function getCategories(): Promise<Category[]> {
  const res = await apiFetch<ApiCollection<Category>>("/api/categories", {
    next: { tags: [tags.categories], revalidate: revalidateSeconds.categories },
  });

  return res.data;
}
