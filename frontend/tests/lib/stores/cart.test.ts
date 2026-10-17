import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { CART_MAX_QUANTITY_PER_LINE } from "@/lib/constants";
import { type CartItem, useCartItemCount, useCartStore } from "@/lib/stores/cart";

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

const state = () => useCartStore.getState();

beforeEach(() => {
  useCartStore.setState({ items: [] });
});

describe("useCartStore", () => {
  it("addItem: 違うバリアントは行を足す", () => {
    state().addItem(item({ variantId: 1 }));
    state().addItem(item({ variantId: 2 }));
    expect(state().items).toHaveLength(2);
  });

  it("addItem: 同じバリアントは数量を足し、行は増やさない", () => {
    state().addItem(item({ quantity: 2 }));
    state().addItem(item({ quantity: 3 }));
    expect(state().items).toHaveLength(1);
    expect(state().items[0].quantity).toBe(5);
  });

  it("addItem: 1 明細の上限（10）を超えない（R4。R3 は押した回数だけ増えて注文が 422 になった）", () => {
    state().addItem(item({ quantity: 8 }));
    state().addItem(item({ quantity: 5 }));
    expect(state().items[0].quantity).toBe(CART_MAX_QUANTITY_PER_LINE);
  });

  it("removeItem: 指定したバリアントだけ消す", () => {
    state().addItem(item({ variantId: 1 }));
    state().addItem(item({ variantId: 2 }));
    state().removeItem(1);
    expect(state().items.map((i) => i.variantId)).toEqual([2]);
  });

  it("setQuantity: 数量を変える（上限で止める）", () => {
    state().addItem(item());
    state().setQuantity(1, 4);
    expect(state().items[0].quantity).toBe(4);
    state().setQuantity(1, 99);
    expect(state().items[0].quantity).toBe(CART_MAX_QUANTITY_PER_LINE);
  });

  it("setQuantity: 0 以下は削除", () => {
    state().addItem(item());
    state().setQuantity(1, 0);
    expect(state().items).toHaveLength(0);
  });

  it("clear: 全部消す", () => {
    state().addItem(item({ variantId: 1 }));
    state().addItem(item({ variantId: 2 }));
    state().clear();
    expect(state().items).toHaveLength(0);
  });
});

describe("useCartItemCount", () => {
  it("行数ではなく数量の合計を返す（ヘッダーの CART (n)）", () => {
    state().addItem(item({ variantId: 1, quantity: 2 }));
    state().addItem(item({ variantId: 2, quantity: 3 }));
    const { result } = renderHook(() => useCartItemCount());
    expect(result.current).toBe(5);
  });
});
