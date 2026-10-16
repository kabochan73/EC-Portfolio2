// ─────────────────────────────────────────────────────────────
// Laravel API のレスポンス形と対応する TypeScript 型。
// backend/app/Http/Resources/* の形と 1:1 に揃える（Resource を変えたらここも直す）。
// docs/08-frontend-design.md §7: 1関数専用の入力型も含めて全部このファイルに集約する。
// R4 では、使う Step ごとに型を足していく（Step 32 はカタログの分だけ）。
// ─────────────────────────────────────────────────────────────

/** 単体リソース { "data": {...} } */
export type ApiResource<T> = { data: T };

/** 一覧リソース { "data": [...] } */
export type ApiCollection<T> = { data: T[] };

// ── Enums（backend/app/Enums/*）───────────────────────────────

/** backend/app/Enums/StockStatus.php */
export type StockStatus = "sold_out" | "low_stock" | "in_stock";

// ── カタログ（Resources/Shop/*）──────────────────────────────

// Shop/CategoryResource
export type Category = {
  id: number;
  name: string;
  slug: string;
};

// Shop/ProductImageResource
export type ProductImage = {
  id: number;
  url: string;
  alt: string | null;
  position: number;
};

// Shop/ProductSummaryResource（一覧カード・関連商品で共通）
export type ProductSummary = {
  id: number;
  name: string;
  slug: string;
  price: number;
  category: { name: string; slug: string };
  stock_status: StockStatus;
  is_new: boolean;
  images: ProductImage[];
};
