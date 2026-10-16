import { z } from "zod";

// backend/app/Http/Requests/Auth/UpdateProfileRequest.php と揃える。
export const profileSchema = z.object({
  name: z.string().min(1, "氏名を入力してください").max(255),
  email: z
    .string()
    .min(1, "メールアドレスを入力してください")
    .email("メールアドレスの形式が正しくありません")
    .max(255),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
