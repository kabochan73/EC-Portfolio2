import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import CartLine from "@/components/cart/CartLine";
import { CART_MAX_QUANTITY_PER_LINE } from "@/lib/constants";
import { type CartItem, useCartStore } from "@/lib/stores/cart";
import type { CartLineValidation } from "@/lib/types";

function item(overrides: Partial<CartItem> = {}): CartItem {
  return {
    variantId: 1,
    productSlug: "boxy-cotton-t-shirt",
    productName: "Boxy Cotton T-Shirt",
    size: "M",
    color: "Black",
    unitPrice: 5000,
    quantity: 2,
    imageUrl: null,
    ...overrides,
  };
}

const ok: CartLineValidation = { variant_id: 1, available: true };

beforeEach(() => {
  useCartStore.setState({ items: [] });
});

describe("CartLine", () => {
  it("商品名・サイズ / 色・小計を出す", () => {
    render(<CartLine item={item()} validation={ok} />);
    expect(screen.getByText("Boxy Cotton T-Shirt")).toBeInTheDocument();
    expect(screen.getByText("M / Black")).toBeInTheDocument();
    expect(screen.getByText("¥10,000")).toBeInTheDocument();
  });

  it("価格が変わっていたら新しい価格で計算し、注意書きを出す", () => {
    render(<CartLine item={item()} validation={{ ...ok, price: 4000 }} />);
    expect(screen.getByText("¥8,000")).toBeInTheDocument();
    expect(screen.getByText(/価格が ¥4,000 に変わりました/)).toBeInTheDocument();
  });

  it("− で数量を 1 減らす / Remove で行を消す", async () => {
    const user = userEvent.setup();
    useCartStore.setState({ items: [item()] });
    const { rerender } = render(<CartLine item={item()} validation={ok} />);

    await user.click(screen.getByRole("button", { name: "数量を減らす" }));
    expect(useCartStore.getState().items[0].quantity).toBe(1);

    rerender(<CartLine item={useCartStore.getState().items[0]} validation={ok} />);
    await user.click(screen.getByRole("button", { name: /remove/i }));
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it("+ は在庫の上限、上限が無ければ 1 明細の上限（10）で押せなくなる", () => {
    const { rerender } = render(<CartLine item={item({ quantity: 3 })} validation={{ ...ok, max_quantity: 3 }} />);
    expect(screen.getByRole("button", { name: "数量を増やす" })).toBeDisabled();

    rerender(<CartLine item={item({ quantity: CART_MAX_QUANTITY_PER_LINE })} validation={ok} />);
    expect(screen.getByRole("button", { name: "数量を増やす" })).toBeDisabled();
  });

  it("問題の種類ごとに注意書きを出す", () => {
    const { rerender } = render(<CartLine item={item()} validation={{ variant_id: 1, available: false }} />);
    expect(screen.getByText(/現在購入できません/)).toBeInTheDocument();

    rerender(<CartLine item={item()} validation={{ ...ok, stock_status: "sold_out" }} />);
    expect(screen.getByText("Sold out")).toBeInTheDocument();

    rerender(<CartLine item={item({ quantity: 5 })} validation={{ ...ok, max_quantity: 3 }} />);
    expect(screen.getByText(/在庫は 3 点までです/)).toBeInTheDocument();
  });
});
