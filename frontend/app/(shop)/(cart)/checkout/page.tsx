import type { Metadata } from "next";

import CheckoutClient from "@/components/checkout/CheckoutClient";
import { getAddresses } from "@/lib/addresses";
import { requireAuth } from "@/lib/auth";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  // 注文にメール認証は必須にしない（ポートフォリオ用途で誰でも一通り購入体験できるように）。
  const { token } = await requireAuth("/checkout");

  const addresses = await getAddresses(token);

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="mb-8 text-2xl font-medium tracking-[0.15em] uppercase">Checkout</h1>
      <CheckoutClient addresses={addresses} />
    </div>
  );
}
