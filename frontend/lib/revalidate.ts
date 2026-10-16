// ─────────────────────────────────────────────────────────────
// ISR タグの一元管理（docs/08-frontend-design.md §3.2）。
//
// カタログ読み取り（getProducts / getProduct / getCategories）と CMS（getContent）に
// これらのタグを付けてキャッシュし、管理側の更新時に BFF Route Handler から
// revalidate() を呼んでオンデマンド無効化する。
// ─────────────────────────────────────────────────────────────

import { revalidateTag } from "next/cache";

export const tags = {
  products: "products", // 商品一覧・カード表示全般
  product: (slug: string) => `product:${slug}`,
  categories: "categories",
  content: "content", // CMS（トップの Hero/Concept/Lookbook/About）
} as const;

// 再検証間隔（秒）。オンデマンド無効化が正で、これは保険。
export const revalidateSeconds = {
  products: 600,
  categories: 3600,
  content: 3600,
} as const;

/**
 * BFF Route Handler 用。指定タグのキャッシュを無効化する。
 * revalidateTag が投げても Route Handler 全体を落とさないよう握る。
 */
export function revalidate(...names: string[]): void {
  for (const name of names) {
    try {
      revalidateTag(name);
    } catch (error) {
      console.error(`revalidateTag(${name}) failed`, error);
    }
  }
}
