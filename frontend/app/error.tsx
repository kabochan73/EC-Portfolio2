"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * (shop) / admin の「レイアウト」でエラーが出たときの受け皿。
 * error.tsx は同じフォルダの page のエラーは受けるが、同じフォルダの layout のエラーは受けられない
 * （layout の外側＝1 つ上の error.tsx の担当）。admin/layout.tsx の requireAdmin() が Laravel に
 * つながらないとき、これが無いと global-error まで落ちる（R4。Step 49 で Laravel を止めて確認して気づいた）
 */
export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      <p className="text-xs tracking-[0.2em] text-graphite uppercase">Something went wrong</p>
      <p className="mt-4 text-sm text-graphite">ページを読み込めませんでした。しばらくしてからもう一度お試しください。</p>
      <div className="mt-8 flex gap-4">
        <button
          type="button"
          onClick={reset}
          className="border border-ink px-6 py-3 text-xs tracking-[0.2em] uppercase transition-opacity hover:opacity-60"
        >
          Retry
        </button>
        <Link
          href="/"
          className="border border-ink px-6 py-3 text-xs tracking-[0.2em] uppercase transition-opacity hover:opacity-60"
        >
          Home
        </Link>
      </div>
    </div>
  );
}
