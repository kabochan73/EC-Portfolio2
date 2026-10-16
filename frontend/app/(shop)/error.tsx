"use client";

import { useEffect } from "react";

// (shop) 配下で描画中にエラーが出たときの受け皿（docs/08 §11）。Header / Footer は残る
export default function ShopError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-6 text-center">
      <p className="text-xs tracking-[0.2em] text-graphite uppercase">Something went wrong</p>
      <p className="mt-4 text-sm text-graphite">ページを読み込めませんでした。しばらくしてからもう一度お試しください。</p>
      <button
        type="button"
        onClick={reset}
        className="mt-8 border border-ink px-6 py-3 text-xs tracking-[0.2em] uppercase transition-opacity hover:opacity-60"
      >
        Retry
      </button>
    </div>
  );
}
