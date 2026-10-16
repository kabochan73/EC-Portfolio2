import { z } from "zod";

// backend/app/Http/Requests/Admin/Variant/{Store,Update}VariantRequest.php と揃える。
// size は新規作成のときだけ選べる（更新では変えられない。docs/05-admin.md）。編集フォームでも
// 今の size を入れておくので、スキーマは 1 つで足りる
export const SIZES = ["S", "M", "L", "FREE"] as const;

export const variantSchema = z.object({
  size: z.enum(SIZES),
  color: z.string().max(30).optional().or(z.literal("")),
  sku: z.string().min(1, "SKU を入力してください").max(40),
  stock: z.coerce.number().int().min(0, "0 以上の整数で入力してください"),
});

export type VariantFormValues = z.infer<typeof variantSchema>;

/** Laravel に送る形（空の color は null）。更新では size を送らない */
export type CreateVariantPayload = Omit<VariantFormValues, "color"> & { color: string | null };
export type UpdateVariantPayload = Omit<CreateVariantPayload, "size">;
