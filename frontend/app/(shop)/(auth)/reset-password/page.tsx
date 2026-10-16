import type { Metadata } from "next";
import Link from "next/link";

import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = { title: "Reset Password" };

type PageProps = { searchParams: Promise<{ token?: string; email?: string }> };

/**
 * パスワード再設定（Server Component）。メールのリンクの ?token= / ?email= はここで読み、
 * 欠けていれば「リンクが正しくありません」をサーバーで出し分ける。正しいリンクのときだけフォーム（CC）を出す
 * （docs/08 §3.6。R3 はフォームが useSearchParams で読み、ページは Suspense で包んでいた）。
 */
export default async function ResetPasswordPage({ searchParams }: PageProps) {
  const { token, email } = await searchParams;

  if (!token || !email) {
    return (
      <div className="mx-auto max-w-sm px-6 py-24 text-center">
        <h1 className="text-2xl tracking-[0.15em] uppercase">Reset Password</h1>
        <p className="mt-12 text-sm text-graphite">
          リンクが正しくありません。もう一度パスワード再設定をリクエストしてください。
        </p>
        <p className="mt-8 text-xs text-graphite">
          <Link href="/forgot-password" className="text-ink underline underline-offset-2">
            Request New Link
          </Link>
        </p>
      </div>
    );
  }

  return <ResetPasswordForm token={token} email={email} />;
}
