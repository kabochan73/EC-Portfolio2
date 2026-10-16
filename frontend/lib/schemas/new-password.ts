import { z } from "zod";

// 「新しいパスワード + 確認用」の共通ルール（R4）。会員登録・パスワードリセット・パスワード変更で使う。
// R3 は 3 つのスキーマに同じルールを別々に書いていた。backend の Password::min(8) + confirmed と揃える。

export const newPasswordFields = {
  password: z.string().min(8, "パスワードは8文字以上で入力してください"),
  password_confirmation: z.string().min(1, "確認用パスワードを入力してください"),
};

/** .refine(passwordsMatch.check, passwordsMatch.options) で使う */
export const passwordsMatch = {
  check: (data: { password: string; password_confirmation: string }) =>
    data.password === data.password_confirmation,
  options: { message: "パスワードが一致しません", path: ["password_confirmation"] },
};
