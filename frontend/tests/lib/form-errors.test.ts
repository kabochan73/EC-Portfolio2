import { describe, expect, it, vi } from "vitest";

import { applyLaravelErrors } from "@/lib/form-errors";

describe("applyLaravelErrors", () => {
  it("422 の errors を各項目の setError に割り当て、まとめ用のメッセージは出さない（null）", () => {
    const setError = vi.fn();
    const body = {
      message: "The slug has already been taken. (and 1 more error)",
      errors: { slug: ["The slug has already been taken."], name: ["The name field is required.", "2 つ目"] },
    };

    expect(applyLaravelErrors(body, setError, "保存できませんでした。")).toBeNull();
    expect(setError).toHaveBeenCalledTimes(2);
    expect(setError).toHaveBeenCalledWith("slug", { message: "The slug has already been taken." });
    expect(setError).toHaveBeenCalledWith("name", { message: "The name field is required." }); // 1 つ目だけ
  });

  it("errors が無ければ（409 など）Laravel の message を返す", () => {
    const setError = vi.fn();
    expect(applyLaravelErrors({ message: "商品が 4 件あります。" }, setError, "失敗")).toBe("商品が 4 件あります。");
    expect(setError).not.toHaveBeenCalled();
  });

  it("本文が読めなければ（null）fallback を返す", () => {
    expect(applyLaravelErrors(null, vi.fn(), "保存できませんでした。")).toBe("保存できませんでした。");
  });
});
