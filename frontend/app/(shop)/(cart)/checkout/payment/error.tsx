"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * 決済ページの受け皿（docs/08 §11「決済を開始できませんでした。カートに戻る」）。
 * PaymentIntent の作成（Stripe / Laravel）が思わぬ形で失敗したとき。503 / 409 はページ自身がパネルで出す。
 * R4: docs にあるのに R3 は作っていなかった（(shop)/error.tsx の汎用の文言になっていた）
 */
export default function PaymentError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-6 text-center">
      <p className="text-xs tracking-[0.2em] text-graphite uppercase">Payment unavailable</p>
      <p className="mt-4 text-sm text-graphite">決済を開始できませんでした。少し時間をおいてお試しください。</p>
      <div className="mt-8 flex gap-4">
        <button
          type="button"
          onClick={reset}
          className="border border-ink px-6 py-3 text-xs tracking-[0.2em] uppercase transition-opacity hover:opacity-60"
        >
          Retry
        </button>
        <Link
          href="/cart"
          className="bg-ink px-6 py-3 text-xs tracking-[0.2em] text-paper uppercase transition-opacity hover:opacity-80"
        >
          Back to Cart
        </Link>
      </div>
    </div>
  );
}
