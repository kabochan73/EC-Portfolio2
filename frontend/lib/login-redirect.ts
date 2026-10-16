// ログイン後の遷移先を決める純粋関数（クライアント安全）。
// - ?redirect= があればそこへ戻す（middleware / requireAuth が付けた戻り先）
// - 無ければ admin は管理画面、それ以外はマイページ
// redirect は URL から来る値なので、サイト内のパス（"/" 始まり・"//" 始まりでない）だけ受け付ける。
// "//evil.example" のような値で外部サイトへ飛ばされる（オープンリダイレクト）のを防ぐ。

import type { User } from "@/lib/types";

export function resolveLoginRedirect(redirect: string | null, role: User["role"]): string {
  const isInSitePath =
    redirect !== null &&
    redirect.startsWith("/") &&
    !redirect.startsWith("//") &&
    !redirect.startsWith("/\\");
  if (isInSitePath) {
    return redirect;
  }
  return role === "admin" ? "/admin" : "/account";
}
