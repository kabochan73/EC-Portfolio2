import Link from "next/link";

import AdminNav from "@/components/admin/AdminNav";
import { requireAdmin } from "@/lib/auth";

/**
 * 管理画面の共通レイアウト（docs/05-admin.md）。
 * ストアフロントの (shop) とは別系統で、Header/Footer を持たず
 * サイドバー付きの機能優先レイアウトにする。
 * requireAdmin() で「未ログイン → /login」「非 admin → /」を弾く。
 * PC ではサイドバーを画面の左に固定する（sticky + 画面の高さ。2026-11-02 ユーザーの要望）。
 * flex の横並びだとサイドバーが本文の高さまで伸びて sticky が効かないので self-start にする
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireAdmin("/admin");

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="w-full flex-none border-b border-ink px-4 py-6 md:sticky md:top-0 md:h-screen md:w-56 md:self-start md:overflow-y-auto md:border-r md:border-b-0 md:px-6 md:py-8">
        <p className="mb-4 text-xs tracking-[0.15em] uppercase md:mb-8">EC-Portfolio Admin</p>
        <AdminNav />
        <div className="mt-4 border-t border-mist pt-4 text-[11px] text-graphite md:mt-10">
          <p className="mb-2">{user.name}</p>
          <div className="flex gap-4 md:flex-col md:gap-1">
            <Link href="/account" className="underline hover:text-ink">
              My Account
            </Link>
            <Link href="/" className="underline hover:text-ink">
              Back to Store
            </Link>
          </div>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 md:px-10 md:py-8">{children}</main>
    </div>
  );
}
