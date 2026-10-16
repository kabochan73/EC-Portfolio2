// ─────────────────────────────────────────────────────────────
// API のレスポンス型の入口（docs/08-frontend-design.md §7）。
// 使う側は今までどおり `import type { ... } from "@/lib/types"` と書く。
// 実体は領域ごとのファイルに分ける（R4。R3 は 370 行の types.ts 1 ファイルだった）。
//
// ここに置くのは「API と画面の間で共有する型」だけ:
//  - フォームの入力の型 → lib/schemas/*.ts の z.infer から作る（手書きの XxxPayload は作らない）
//  - コンポーネントの props の型 → そのコンポーネントのファイルの中に書く
// ─────────────────────────────────────────────────────────────

export * from "./api";
export * from "./cart";
export * from "./catalog";
export * from "./cms";
