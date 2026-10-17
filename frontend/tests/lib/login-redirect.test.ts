import { describe, expect, it } from "vitest";

import { resolveLoginRedirect } from "@/lib/login-redirect";

describe("resolveLoginRedirect", () => {
  it("戻り先が無ければ、admin は管理画面・会員はマイページ", () => {
    expect(resolveLoginRedirect(null, "admin")).toBe("/admin");
    expect(resolveLoginRedirect(null, "customer")).toBe("/account");
  });

  it("サイト内のパスならそこへ戻す", () => {
    expect(resolveLoginRedirect("/admin/orders/EC-1", "admin")).toBe("/admin/orders/EC-1");
    expect(resolveLoginRedirect("/checkout?step=2", "customer")).toBe("/checkout?step=2");
  });

  it("サイトの外へ飛ばす値は無視する（オープンリダイレクト対策）", () => {
    expect(resolveLoginRedirect("https://evil.example", "customer")).toBe("/account");
    expect(resolveLoginRedirect("//evil.example", "customer")).toBe("/account");
    expect(resolveLoginRedirect("/\\evil.example", "admin")).toBe("/admin");
  });
});
