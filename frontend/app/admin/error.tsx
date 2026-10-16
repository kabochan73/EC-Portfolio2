"use client";

import { useEffect } from "react";

// /admin 配下の page で描画中にエラーが出たときの受け皿。サイドバーは残る。
// admin/layout.tsx 自体のエラー（requireAdmin が Laravel につながらない等）は app/error.tsx が受ける
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-start justify-center gap-4">
      <p className="text-xs tracking-[0.2em] text-graphite uppercase">Something went wrong</p>
      <p className="text-sm text-graphite">データを読み込めませんでした。しばらくしてからもう一度お試しください。</p>
      <button
        type="button"
        onClick={reset}
        className="border border-ink px-6 py-3 text-xs tracking-[0.2em] uppercase transition-colors hover:bg-mist"
      >
        Retry
      </button>
    </div>
  );
}
