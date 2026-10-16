// middleware.ts（Edge Runtime、next/headers は使えない）と lib/auth.ts（Node Runtime）の
// 両方から参照するので、依存の少ない単独ファイルに置く（docs/08 §4）。
export const SESSION_COOKIE_NAME = "ecp_token";

// カート（Zustand persist）の localStorage キー（docs/08 §5）。
export const CART_STORAGE_KEY = "ecp-cart";

// backend/config/shop.php と値を合わせる（表示用の概算計算に使う）。
// 確定額は POST /api/orders でサーバー側が再計算するので、ここがズレても実害は無い。
export const SHIPPING_FEE = 800;
export const FREE_SHIPPING_THRESHOLD = 20_000;

// 在庫ステータスのしきい値（backend/config/shop.php の low_stock_threshold）。
export const LOW_STOCK_THRESHOLD = 5;

// 1明細あたりの最大数量（backend/config/shop.php の cart_max_quantity_per_line）。
export const CART_MAX_QUANTITY_PER_LINE = 10;
