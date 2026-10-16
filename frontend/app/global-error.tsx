"use client";

import { useEffect } from "react";

import "./globals.css";

/**
 * ルートレイアウト（app/layout.tsx）自体が落ちたときの最後の受け皿。
 * レイアウトの代わりに描かれるので、自前の <html><body> が要る（ふつうの error.tsx と違う点）。
 * R4: globals.css を読み込んで Tailwind のクラスで書く（R3 は style 属性に色や余白を直書きしていた）
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="ja">
      <body className="flex min-h-screen flex-col items-center justify-center bg-paper px-6 text-center font-sans text-ink">
        <p className="text-xs tracking-[0.2em] text-graphite uppercase">Something went wrong</p>
        <p className="mt-4 text-sm text-graphite">ページを読み込めませんでした。</p>
        <button
          type="button"
          onClick={reset}
          className="mt-8 border border-ink px-6 py-3 text-xs tracking-[0.2em] uppercase transition-opacity hover:opacity-60"
        >
          Retry
        </button>
      </body>
    </html>
  );
}
