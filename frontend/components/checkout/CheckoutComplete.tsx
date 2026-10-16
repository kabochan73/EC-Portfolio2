"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import { useOrderStatusPolling } from "@/lib/hooks/useOrderStatusPolling";
import { useCartStore } from "@/lib/stores/cart";
import type { OrderDetail } from "@/lib/types";

const PAID_STATUSES = new Set(["paid", "shipped", "completed"]);

type Props = {
  initial: OrderDetail;
  /** Stripe が return_url に付ける ?redirect_status=（succeeded / failed など）。
   *  page.tsx（SC）が searchParams から読んで渡す（docs/08 §3.6。R3 は useSearchParams + Suspense） */
  redirectStatus: string | null;
};

/**
 * 決済後の完了画面（Client Component）。Webhook が注文を paid にするまでポーリングし、
 * paid になったらカートを空にする（paid への遷移は Webhook が唯一の真実。docs/09）。
 */
export default function CheckoutComplete({ initial, redirectStatus }: Props) {
  const { order, timedOut } = useOrderStatusPolling(initial.order_number, initial);
  const clear = useCartStore((state) => state.clear);
  const cleared = useRef(false);

  const paid = PAID_STATUSES.has(order.status);

  useEffect(() => {
    if (paid && !cleared.current) {
      cleared.current = true;
      clear();
    }
  }, [paid, clear]);

  const orderLink = `/account/orders/${order.order_number}`;

  if (paid) {
    return (
      <div className="text-center">
        <p className="text-xs tracking-[0.3em] text-graphite uppercase">Thank you</p>
        <h1 className="mt-4 text-2xl font-medium tracking-[0.15em] uppercase">Order Confirmed</h1>
        <p className="mt-4 text-sm">
          ご注文ありがとうございます。確認メールをお送りしました。
        </p>
        <p className="mt-2 text-[11px] tracking-widest text-graphite uppercase">
          {order.order_number}
        </p>
        <div className="mt-10 flex flex-col items-center gap-3">
          <Link
            href={orderLink}
            className="border border-ink px-6 py-3 text-xs tracking-[0.2em] uppercase transition-opacity hover:opacity-60"
          >
            View Order
          </Link>
          <Link
            href="/"
            className="text-[11px] tracking-widest text-graphite uppercase hover:text-ink"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  if (order.status === "cancelled") {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-medium tracking-[0.15em] uppercase">Payment Failed</h1>
        <p className="mt-4 text-sm">決済を完了できませんでした。</p>
        {order.payment?.last_error && (
          <p className="mt-2 text-xs text-graphite">{order.payment.last_error}</p>
        )}
        <div className="mt-10 flex flex-col items-center gap-3">
          <Link
            href="/cart"
            className="border border-ink px-6 py-3 text-xs tracking-[0.2em] uppercase transition-opacity hover:opacity-60"
          >
            Back to Cart
          </Link>
        </div>
      </div>
    );
  }

  // pending — Webhook 待ち
  const failedHint = redirectStatus === "failed";

  return (
    <div className="text-center">
      <h1 className="text-2xl font-medium tracking-[0.15em] uppercase">
        {failedHint ? "Payment Declined" : "Processing"}
      </h1>
      <p className="mt-4 text-sm">
        {failedHint
          ? "カードが承認されませんでした。もう一度お試しください。"
          : timedOut
            ? "決済の確認に時間がかかっています。注文ページで最新の状態をご確認ください。"
            : "決済を確認しています…"}
      </p>
      {!failedHint && !timedOut && (
        <span
          className="mt-6 inline-block h-4 w-4 animate-spin border border-ink border-t-transparent"
          aria-hidden
        />
      )}
      <div className="mt-10 flex flex-col items-center gap-3">
        {(failedHint || timedOut) && (
          <Link
            href={`/checkout/payment?order=${order.order_number}`}
            className="border border-ink px-6 py-3 text-xs tracking-[0.2em] uppercase transition-opacity hover:opacity-60"
          >
            Retry Payment
          </Link>
        )}
        <Link
          href={orderLink}
          className="text-[11px] tracking-widest text-graphite uppercase hover:text-ink"
        >
          View Order
        </Link>
      </div>
    </div>
  );
}
