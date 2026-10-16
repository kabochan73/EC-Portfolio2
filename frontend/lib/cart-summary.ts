// カート明細から「行ごとの問題」と「金額・購入可否」を計算する純粋関数（クライアント安全）。
// /cart と /checkout で同じ計算を使う。確定金額は POST /api/orders でサーバーが
// 再計算するので、ここはあくまで表示用。
//
// R4: R3 は送料・合計を summarizeCart / CartSummary / カートページ本体の 3 か所で、
// 「この行は買えない」の判定を CartLine と summarizeCart の 2 か所で計算していた。ここに集約する。

import {
  CART_MAX_QUANTITY_PER_LINE,
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_FEE,
} from "@/lib/constants";
import type { CartItem } from "@/lib/stores/cart";
import type { CartLineValidation } from "@/lib/types";

/** 1 行の問題。null なら問題なし（買える） */
export type LineProblem =
  | { kind: "unavailable" } // 販売終了・非公開・削除済み
  | { kind: "sold_out" }
  | { kind: "over_stock"; max: number }; // カートの数量 > 買える上限

export function lineProblem(item: CartItem, validation: CartLineValidation): LineProblem | null {
  if (!validation.available) return { kind: "unavailable" };
  if (validation.stock_status === "sold_out") return { kind: "sold_out" };

  const max = validation.max_quantity ?? CART_MAX_QUANTITY_PER_LINE;
  if (item.quantity > max) return { kind: "over_stock", max };

  return null;
}

/** 今の価格（再検証の結果があればそれ、無ければカートに入れた時点の価格） */
export function currentUnitPrice(item: CartItem, validation: CartLineValidation): number {
  return validation.price ?? item.unitPrice;
}

export type CartTotals = {
  subtotal: number;
  shipping: number;
  total: number;
  /** 送料無料まであといくらか（すでに無料なら 0） */
  untilFreeShipping: number;
  /** 問題のある行が 1 つでもあれば true（チェックアウトに進めない） */
  blocked: boolean;
};

export function summarizeCart(
  items: CartItem[],
  getValidation: (item: CartItem) => CartLineValidation,
): CartTotals {
  let subtotal = 0;
  let blocked = false;

  for (const item of items) {
    const validation = getValidation(item);
    subtotal += currentUnitPrice(item, validation) * item.quantity;
    if (lineProblem(item, validation) !== null) {
      blocked = true;
    }
  }

  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;

  return {
    subtotal,
    shipping,
    total: subtotal + shipping,
    untilFreeShipping: Math.max(FREE_SHIPPING_THRESHOLD - subtotal, 0),
    blocked,
  };
}
