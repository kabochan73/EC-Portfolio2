import { z } from "zod";

import { newPasswordFields, passwordsMatch } from "@/lib/schemas/new-password";

// パスワード変更。backend/app/Http/Requests/Auth/UpdatePasswordRequest.php と揃える
// （current_password・confirmed・different:current_password・Password::min(8)）。
export const passwordSchema = z
  .object({
    current_password: z.string().min(1, "現在のパスワードを入力してください"),
    ...newPasswordFields,
  })
  .refine(passwordsMatch.check, passwordsMatch.options)
  .refine((data) => data.password !== data.current_password, {
    message: "現在のパスワードとは別のパスワードにしてください",
    path: ["password"],
  });

export type PasswordFormValues = z.infer<typeof passwordSchema>;
