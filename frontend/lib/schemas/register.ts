import { z } from "zod";

// backend/app/Http/Requests/Auth/RegisterRequest.php のルールと揃える。
export const registerSchema = z
  .object({
    name: z.string().min(1, "氏名を入力してください").max(255),
    email: z
      .string()
      .min(1, "メールアドレスを入力してください")
      .email("メールアドレスの形式が正しくありません")
      .max(255),
    password: z.string().min(8, "パスワードは8文字以上で入力してください"),
    password_confirmation: z.string().min(1, "確認用パスワードを入力してください"),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: "パスワードが一致しません",
    path: ["password_confirmation"],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;
