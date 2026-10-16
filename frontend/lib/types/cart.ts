// カート再検証（GET /api/cart/validate。backend の Shop\CartController）。
// 購入できない variant は { variant_id, available: false } だけが返るので、他の項目は省略可能。

import type { StockStatus } from "./catalog";

export type CartLineValidation = {
  variant_id: number;
  available: boolean;
  price?: number;
  stock_status?: StockStatus;
  /** min(在庫数, 1 明細の上限)。公開 API で在庫数が分かる唯一の例外（docs/03） */
  max_quantity?: number;
  product_name?: string;
  product_slug?: string;
  size?: string;
  color?: string | null;
  image_url?: string | null;
};
