import Link from "next/link";

import CartCount from "./CartCount";

/**
 * ヘッダーは常に白背景・黒文字・下ボーダー固定（透過なし。docs/01-sitemap-pages.md）。
 * 中央ナビ・検索は置かない。ロゴ ＋ ACCOUNT ＋ CART のみ。
 * 項目が少ないのでモバイルもハンバーガーにせず同じ1行バーをそのまま使う。
 * fixed で常に画面上部に重ねる。本文側は (shop)/layout.tsx の pt-16 で高さを避ける。
 *
 * Header 自体は Server Component。CART (n) だけ Client Component（CartCount。カートは localStorage）。
 * LOGIN は今はただのリンクで、ログイン状態の表示（AccountLink）は Step 36 で差し替える。
 */
export default function Header() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-ink bg-paper text-ink">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="text-xs font-medium tracking-[0.15em] uppercase sm:text-sm sm:tracking-[0.2em]"
        >
          EC-PORTFOLIO
        </Link>

        <nav className="flex items-center gap-4 text-xs tracking-[0.12em] uppercase sm:gap-6 sm:tracking-[0.15em]">
          <Link href="/login" className="transition-opacity hover:opacity-60">
            Login
          </Link>
          <CartCount />
        </nav>
      </div>
    </header>
  );
}
