import { z } from "zod";

import type { SizeChart } from "@/lib/types";

// backend/app/Http/Requests/Admin/Product/ProductRequest.php と揃える。
// size_chart は SizeChartEditor が別に持ち、送信時に ProductForm が合わせる。
export const adminProductSchema = z.object({
  category_id: z.coerce.number().int().min(1, "カテゴリを選択してください"),
  name: z.string().min(1, "商品名を入力してください").max(120),
  slug: z
    .string()
    .min(1, "スラッグを入力してください")
    .max(140)
    .regex(/^[a-z0-9-]+$/, "半角小文字英数字とハイフンのみ使えます"),
  price: z.coerce.number().int().min(1, "価格は 1 以上の整数で入力してください"),
  description: z.string().min(1, "説明を入力してください"),
  material: z.string().min(1, "素材を入力してください"),
  care: z.string().max(1000).optional().or(z.literal("")),
  origin: z.string().min(1, "原産国を入力してください").max(50),
  product_code: z.string().min(1, "品番を入力してください").max(30),
  is_published: z.boolean(),
  position: z.coerce.number().int().min(0),
});

export type AdminProductFormValues = z.infer<typeof adminProductSchema>;

/** Laravel に送る形（フォームの値 + サイズ表。空の care は null にする） */
export type AdminProductPayload = Omit<AdminProductFormValues, "care"> & {
  care: string | null;
  size_chart: SizeChart | null;
};
