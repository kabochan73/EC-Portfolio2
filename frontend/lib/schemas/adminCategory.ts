import { z } from "zod";

// backend/app/Http/Requests/Admin/Category/CategoryRequest.php と揃える（R4 で Store / Update を 1 つに統合）。
// slug は Laravel の alpha_dash 相当（英数字・ハイフン・アンダースコア）。
export const adminCategorySchema = z.object({
  name: z.string().min(1, "名前を入力してください").max(50),
  slug: z
    .string()
    .min(1, "スラッグを入力してください")
    .max(50)
    .regex(/^[A-Za-z0-9_-]+$/, "英数字・ハイフン・アンダースコアのみ使えます"),
});

export type AdminCategoryFormValues = z.infer<typeof adminCategorySchema>;
