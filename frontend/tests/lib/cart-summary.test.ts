import { describe, expect, it } from "vitest";

import { lineProblem, summarizeCart } from "@/lib/cart-summary";
import { CART_MAX_QUANTITY_PER_LINE, FREE_SHIPPING_THRESHOLD, SHIPPING_FEE } from "@/lib/constants";
import type { CartItem } from "@/lib/stores/cart";
import type { CartLineValidation } from "@/lib/types";

function item(overrides: Partial<CartItem> = {}): CartItem {
  return {
    variantId: 1,
    productSlug: "boxy-cotton-t-shirt",
    productName: "Boxy Cotton T-Shirt",
    size: "M",
    color: "Black",
    unitPrice: 5000,
    quantity: 1,
    imageUrl: null,
    ...overrides,
  };
}

/** 再検証の結果がまだ無いとき（available だけ true） */
const optimistic = (i: CartItem): CartLineValidation => ({ variant_id: i.variantId, available: true });

describe("summarizeCart", () => {
  it("小計は 単価 × 数量 の合計", () => {
    const items = [item({ variantId: 1, unitPrice: 5000, quantity: 2 }), item({ variantId: 2, unitPrice: 3000 })];
    expect(summarizeCart(items, optimistic).subtotal).toBe(13000);
  });

  it("しきい値未満は送料あり、ちょうど以上は無料", () => {
    const under = summarizeCart([item({ unitPrice: FREE_SHIPPING_THRESHOLD - 1 })], optimistic);
    expect(under.shipping).toBe(SHIPPING_FEE);
    expect(under.total).toBe(FREE_SHIPPING_THRESHOLD - 1 + SHIPPING_FEE);

    const exact = summarizeCart([item({ unitPrice: FREE_SHIPPING_THRESHOLD })], optimistic);
    expect(exact.shipping).toBe(0);
    expect(exact.total).toBe(FREE_SHIPPING_THRESHOLD);
  });

  it("送料無料まであといくらか（無料なら 0）", () => {
    expect(summarizeCart([item({ unitPrice: 15000 })], optimistic).untilFreeShipping).toBe(FREE_SHIPPING_THRESHOLD - 15000);
    expect(summarizeCart([item({ unitPrice: 30000 })], optimistic).untilFreeShipping).toBe(0);
  });

  it("再検証で返ってきた price が、カートに入れた時点の価格より優先される", () => {
    const validation = (): CartLineValidation => ({ variant_id: 1, available: true, price: 4000 });
    expect(summarizeCart([item({ unitPrice: 5000, quantity: 2 })], validation).subtotal).toBe(8000);
  });

  it("問題のある行が 1 つでもあれば blocked、全部正常なら false", () => {
    const soldOut = (i: CartItem): CartLineValidation =>
      i.variantId === 2 ? { variant_id: 2, available: true, stock_status: "sold_out" } : optimistic(i);
    expect(summarizeCart([item(), item({ variantId: 2 })], soldOut).blocked).toBe(true);
    expect(summarizeCart([item(), item({ variantId: 2 })], optimistic).blocked).toBe(false);
  });
});

describe("lineProblem", () => {
  it("販売終了（available: false）", () => {
    expect(lineProblem(item(), { variant_id: 1, available: false })).toEqual({ kind: "unavailable" });
  });

  it("売り切れ", () => {
    expect(lineProblem(item(), { variant_id: 1, available: true, stock_status: "sold_out" })).toEqual({ kind: "sold_out" });
  });

  it("数量が max_quantity を超えると over_stock（ちょうどなら問題なし）", () => {
    const v: CartLineValidation = { variant_id: 1, available: true, max_quantity: 3 };
    expect(lineProblem(item({ quantity: 4 }), v)).toEqual({ kind: "over_stock", max: 3 });
    expect(lineProblem(item({ quantity: 3 }), v)).toBeNull();
  });

  it("max_quantity が無いときは 1 明細の上限（10）で判定する", () => {
    expect(lineProblem(item({ quantity: CART_MAX_QUANTITY_PER_LINE + 1 }), optimistic(item()))).toEqual({
      kind: "over_stock",
      max: CART_MAX_QUANTITY_PER_LINE,
    });
  });
});
