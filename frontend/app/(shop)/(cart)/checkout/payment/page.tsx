import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import PaymentForm from "@/components/checkout/PaymentForm";
import StripeProvider from "@/components/checkout/StripeProvider";
import { ApiError } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { createPaymentIntent } from "@/lib/checkout";
import { formatYen } from "@/lib/format";
import { getMyOrder } from "@/lib/orders";
import type { PaymentIntentResponse } from "@/lib/types";

export const metadata: Metadata = { title: "Payment" };

type PageProps = { searchParams: Promise<{ order?: string }> };

export default async function PaymentPage({ searchParams }: PageProps) {
  const { order: orderNumber } = await searchParams;
  if (!orderNumber) redirect("/account/orders");

  // 決済にメール認証は必須にしない（ポートフォリオ用途）。
  const { token } = await requireAuth(`/checkout/payment?order=${orderNumber}`);

  const order = await getMyOrder(token, orderNumber);
  if (!order) redirect("/account/orders");
  if (order.status !== "pending") redirect(`/checkout/complete?order=${orderNumber}`);

  let intent: PaymentIntentResponse | null = null;
  let failure: "unavailable" | "mismatch" | null = null;
  try {
    intent = await createPaymentIntent(token, orderNumber);
  } catch (error) {
    if (error instanceof ApiError && error.status === 503) {
      failure = "unavailable";
    } else if (error instanceof ApiError && error.status === 409) {
      failure = "mismatch";
    } else {
      throw error;
    }
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-12">
      <nav className="mb-8 text-[11px] tracking-widest text-graphite uppercase">
        <Link href="/cart" className="hover:text-ink">
          Cart
        </Link>
        <span className="mx-2">/</span>
        <Link href="/checkout" className="hover:text-ink">
          Checkout
        </Link>
        <span className="mx-2">/</span>
        <span>Payment</span>
      </nav>

      <h1 className="mb-2 text-2xl font-medium tracking-[0.15em] uppercase">Payment</h1>
      <p className="mb-8 text-[11px] tracking-widest text-graphite uppercase">
        {order.order_number} — 合計 {formatYen(order.total)}
      </p>

      {failure === "unavailable" && (
        <div className="border border-ink p-6 text-sm">
          <p>決済は現在ご利用いただけません。時間をおいて再度お試しください。</p>
          <Link
            href="/account/orders"
            className="mt-4 inline-block text-[11px] tracking-widest text-graphite uppercase hover:text-ink"
          >
            View Orders
          </Link>
        </div>
      )}

      {failure === "mismatch" && (
        <div className="border border-ink p-6 text-sm">
          <p>商品の価格が変更されました。お手数ですがカートからやり直してください。</p>
          <Link
            href="/cart"
            className="mt-4 inline-block text-[11px] tracking-widest text-graphite uppercase hover:text-ink"
          >
            Back to Cart
          </Link>
        </div>
      )}

      {intent && (
        <StripeProvider
          publishableKey={intent.publishable_key}
          clientSecret={intent.client_secret}
        >
          <PaymentForm orderNumber={order.order_number} total={order.total} />
        </StripeProvider>
      )}
    </div>
  );
}
