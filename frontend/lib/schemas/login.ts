import { z } from "zod";

// backend/app/Http/Requests/Auth/LoginRequest.php のルールと揃える。
// クライアント zod は UX（送信前に気づかせる）用。最終防衛は Laravel。
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "メールアドレスを入力してください")
    .email("メールアドレスの形式が正しくありません"),
  password: z.string().min(1, "パスワードを入力してください"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
