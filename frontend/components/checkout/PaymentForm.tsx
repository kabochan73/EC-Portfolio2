"use client";

import { PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { useState } from "react";

import { formatYen } from "@/lib/format";

type Props = {
  orderNumber: string;
  total: number;
};

/**
 * Payment Element で決済を確定する（docs/09-payments-stripe.md）。
 * 成功時は return_url（/checkout/complete）へリダイレクトされる。
 * paid への遷移は Webhook が唯一の真実なので、complete 側でポーリングして確認する。
 */
export default function PaymentForm({ orderNumber, total }: Props) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    setError(null);

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/complete?order=${orderNumber}`,
      },
    });

    // ここに到達するのは即時エラー時のみ（成功時は return_url へ遷移する）。
    setError(stripeError.message ?? "決済を完了できませんでした。");
    setSubmitting(false);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <PaymentElement />

      {error && <p className="text-xs text-graphite">{error}</p>}

      <button
        type="submit"
        disabled={!stripe || submitting}
        className="block w-full bg-ink py-3 text-center text-xs tracking-widest text-paper uppercase transition-opacity hover:opacity-80 disabled:opacity-50"
      >
        {submitting ? "..." : `${formatYen(total)} を支払う`}
      </button>

      <p className="text-[11px] tracking-wide text-graphite">
        テスト環境です。カード番号 4242 4242 4242 4242 / 任意の将来の有効期限 / 任意の CVC。
      </p>
    </form>
  );
}
