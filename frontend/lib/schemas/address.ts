import { z } from "zod";

// backend/app/Http/Requests/Address/AddressRequest.php と揃える（R4 で Store / Update を 1 つに統合）。
export const addressSchema = z.object({
  recipient_name: z.string().min(1, "宛名を入力してください").max(100),
  postal_code: z
    .string()
    .regex(/^\d{3}-\d{4}$/, "郵便番号は 123-4567 の形式で入力してください"),
  prefecture: z.string().min(1, "都道府県を入力してください").max(10),
  city: z.string().min(1, "市区町村を入力してください").max(100),
  address_line1: z.string().min(1, "番地を入力してください").max(255),
  address_line2: z.string().max(255).optional().or(z.literal("")),
  phone: z.string().min(1, "電話番号を入力してください").max(20),
  is_default: z.boolean().optional(),
});

export type AddressFormValues = z.infer<typeof addressSchema>;
