// カタログ（backend/app/Http/Resources/Shop/* と backend/app/Enums/StockStatus.php）。
// Resource を変えたらここも直す。

/** backend/app/Enums/StockStatus.php */
export type StockStatus = "sold_out" | "low_stock" | "in_stock";

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
