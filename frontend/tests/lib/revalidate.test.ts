import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidateTag = vi.fn();
vi.mock("next/cache", () => ({
  revalidateTag: (...args: unknown[]) => revalidateTag(...args),
}));

// モックを貼ってから読み込む
const { revalidate, revalidateSeconds, tags } = await import("@/lib/revalidate");

beforeEach(() => {
  revalidateTag.mockReset();
});

describe("tags", () => {
  it("固定のタグと、商品ごとの product:{slug}", () => {
    expect(tags.products).toBe("products");
    expect(tags.categories).toBe("categories");
    expect(tags.content).toBe("content");
    expect(tags.product("boxy-cotton-t-shirt")).toBe("product:boxy-cotton-t-shirt");
  });

  it("再検証の間隔はすべて正の数", () => {
    for (const seconds of Object.values(revalidateSeconds)) {
      expect(seconds).toBeGreaterThan(0);
    }
  });
});

describe("revalidate()", () => {
  it("渡したタグごとに revalidateTag を呼ぶ", () => {
    revalidate(tags.products, tags.product("x"));
    expect(revalidateTag).toHaveBeenCalledTimes(2);
    expect(revalidateTag).toHaveBeenNthCalledWith(1, "products");
    expect(revalidateTag).toHaveBeenNthCalledWith(2, "product:x");
  });

  it("revalidateTag が投げても全体は落とさず、残りのタグも試す", () => {
    revalidateTag.mockImplementation(() => {
      throw new Error("no store");
    });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => revalidate("products", "content")).not.toThrow();
    expect(revalidateTag).toHaveBeenCalledTimes(2);

    errorSpy.mockRestore();
  });
});
