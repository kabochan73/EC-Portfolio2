import { describe, expect, it } from "vitest";

import { addressSchema } from "@/lib/schemas/address";
import { adminProductSchema } from "@/lib/schemas/adminProduct";
import { passwordSchema } from "@/lib/schemas/password";
import { registerSchema } from "@/lib/schemas/register";

/** 失敗したときのエラーの項目名（path の先頭）を集める */
function errorPaths(result: { success: boolean; error?: { issues: { path: PropertyKey[] }[] } }): PropertyKey[] {
  return result.success ? [] : (result.error?.issues.map((issue) => issue.path[0]) ?? []);
}

describe("addressSchema", () => {
  const valid = {
    recipient_name: "山田 太郎",
    postal_code: "150-0001",
    prefecture: "東京都",
    city: "渋谷区",
    address_line1: "神宮前1-2-3",
    address_line2: "",
    phone: "09012345678",
  };

  it("正しい住所は通る（建物名は空でよい）", () => {
    expect(addressSchema.safeParse(valid).success).toBe(true);
  });

  it("郵便番号はハイフン区切りが必須", () => {
    expect(errorPaths(addressSchema.safeParse({ ...valid, postal_code: "1500001" }))).toEqual(["postal_code"]);
  });

  it("宛名が空だと落ちる", () => {
    expect(errorPaths(addressSchema.safeParse({ ...valid, recipient_name: "" }))).toEqual(["recipient_name"]);
  });
});

describe("パスワード（R4 で newPasswordFields / passwordsMatch を共通化）", () => {
  const change = { current_password: "oldpassword", password: "newpassword", password_confirmation: "newpassword" };

  it("変更: 正しい入力は通る", () => {
    expect(passwordSchema.safeParse(change).success).toBe(true);
  });

  it("変更: 確認用が違うと password_confirmation にエラー", () => {
    expect(errorPaths(passwordSchema.safeParse({ ...change, password_confirmation: "different" }))).toContain(
      "password_confirmation",
    );
  });

  it("変更: 今と同じパスワードは password にエラー", () => {
    const same = { current_password: "samepass1", password: "samepass1", password_confirmation: "samepass1" };
    expect(errorPaths(passwordSchema.safeParse(same))).toContain("password");
  });

  it("変更・登録とも 8 文字未満は落ちる（共通のルール）", () => {
    expect(passwordSchema.safeParse({ ...change, password: "short", password_confirmation: "short" }).success).toBe(false);
    const register = { name: "Taro", email: "taro@example.com", password: "short", password_confirmation: "short" };
    expect(errorPaths(registerSchema.safeParse(register))).toContain("password");
  });
});

describe("adminProductSchema", () => {
  const valid = {
    category_id: 1,
    name: "Boxy Cotton T-Shirt",
    slug: "boxy-cotton-t-shirt",
    price: 12000,
    description: "説明",
    material: "綿100%",
    care: "",
    origin: "日本",
    product_code: "EC-TO0001",
    is_published: true,
    position: 0,
  };

  it("正しい商品は通る", () => {
    expect(adminProductSchema.safeParse(valid).success).toBe(true);
  });

  it("slug に大文字が入ると落ちる", () => {
    expect(errorPaths(adminProductSchema.safeParse({ ...valid, slug: "Boxy-Cotton" }))).toEqual(["slug"]);
  });

  it("価格 0 は落ちる。input の文字列は数値に変える（coerce）", () => {
    expect(adminProductSchema.safeParse({ ...valid, price: 0 }).success).toBe(false);
    const result = adminProductSchema.safeParse({ ...valid, price: "12000" });
    expect(result.success && result.data.price).toBe(12000);
  });
});
