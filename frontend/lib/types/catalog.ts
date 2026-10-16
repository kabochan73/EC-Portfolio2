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

// Shop/ProductVariantResource（公開向け。生の stock は返らない）
export type ProductVariant = {
  id: number;
  size: string;
  color: string | null;
  stock_status: StockStatus;
  stock_label: string;
  selectable: boolean;
};

// docs/02-database-design.md の size_chart JSON フォーマット
export type SizeChart = {
  unit: string;
  columns: string[];
  rows: Record<string, number[]>;
};

// Shop/ProductDetailResource
export type ProductDetail = {
  id: number;
  name: string;
  slug: string;
  price: number;
  category: { name: string; slug: string };
  description: string;
  material: string;
  care: string | null;
  origin: string;
  product_code: string;
  size_chart: SizeChart | null;
  is_new: boolean;
  images: ProductImage[];
  colors: string[];
  variants: ProductVariant[];
  related: ProductSummary[];
};
