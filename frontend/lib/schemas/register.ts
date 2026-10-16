import { z } from "zod";

import { newPasswordFields, passwordsMatch } from "@/lib/schemas/new-password";

// backend/app/Http/Requests/Auth/RegisterRequest.php のルールと揃える。
export const registerSchema = z
  .object({
    name: z.string().min(1, "氏名を入力してください").max(255),
    email: z
      .string()
      .min(1, "メールアドレスを入力してください")
      .email("メールアドレスの形式が正しくありません")
      .max(255),
    ...newPasswordFields,
  })
  .refine(passwordsMatch.check, passwordsMatch.options);

export type RegisterFormValues = z.infer<typeof registerSchema>;
