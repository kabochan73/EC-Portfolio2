import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import VariantSelector from "@/components/product/VariantSelector";
import { useCartStore } from "@/lib/stores/cart";
import type { ProductVariant } from "@/lib/types";

function variant(overrides: Partial<ProductVariant> = {}): ProductVariant {
  return { id: 1, size: "S", color: "Black", stock_status: "in_stock", stock_label: "在庫あり", selectable: true, ...overrides };
}

function renderSelector(variants: ProductVariant[], colors = ["Black"]) {
  return render(
    <VariantSelector
      productSlug="boxy-cotton-t-shirt"
      productName="Boxy Cotton T-Shirt"
      price={12000}
      imageUrl={null}
      colors={colors}
      variants={variants}
    />,
  );
}

const addToCart = () => screen.getByRole("button", { name: /add to cart/i });

beforeEach(() => {
  useCartStore.setState({ items: [] });
});

describe("VariantSelector", () => {
  it("最初の色に属するサイズだけをボタンにする", () => {
    renderSelector(
      [variant({ id: 1, size: "S" }), variant({ id: 2, size: "M" }), variant({ id: 3, size: "L", color: "Ecru" })],
      ["Black", "Ecru"],
    );
    expect(screen.getByRole("button", { name: "S" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "M" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "L" })).not.toBeInTheDocument();
  });

  it("売り切れのサイズは押せない", () => {
    renderSelector([variant({ stock_status: "sold_out", selectable: false })]);
    expect(screen.getByRole("button", { name: "S" })).toBeDisabled();
  });

  it("サイズを選ぶまで Add to Cart は押せない", () => {
    renderSelector([variant()]);
    expect(addToCart()).toBeDisabled();
  });

  it("サイズを選んで Add to Cart → カートに入る", async () => {
    const user = userEvent.setup();
    renderSelector([variant({ id: 7, size: "M" })]);

    await user.click(screen.getByRole("button", { name: "M" }));
    expect(addToCart()).toBeEnabled();
    await user.click(addToCart());

    expect(useCartStore.getState().items).toEqual([
      expect.objectContaining({ variantId: 7, size: "M", color: "Black", quantity: 1, unitPrice: 12000 }),
    ]);
  });

  it("selectable: false のサイズは選んでも Add to Cart が押せないまま", async () => {
    const user = userEvent.setup();
    renderSelector([variant({ stock_status: "low_stock", selectable: false })]);

    await user.click(screen.getByRole("button", { name: /^s/i }));
    expect(addToCart()).toBeDisabled();
  });

  it("色を変えるとサイズの選択が外れる", async () => {
    const user = userEvent.setup();
    renderSelector([variant({ id: 1, size: "M" }), variant({ id: 2, size: "M", color: "Ecru" })], ["Black", "Ecru"]);

    await user.click(screen.getByRole("button", { name: "M" }));
    expect(addToCart()).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Ecru" }));
    expect(addToCart()).toBeDisabled();
  });
});
