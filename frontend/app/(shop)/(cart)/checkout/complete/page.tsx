import type { Metadata } from "next";
import { redirect } from "next/navigation";

import CheckoutComplete from "@/components/checkout/CheckoutComplete";
import { requireAuth } from "@/lib/auth";
import { getMyOrder } from "@/lib/orders";

export const metadata: Metadata = { title: "Order Complete" };

type PageProps = { searchParams: Promise<{ order?: string; redirect_status?: string }> };

/**
 * 決済後に Stripe から戻ってくるページ（Server Component）。注文を取り、
 * ?redirect_status= と一緒に CheckoutComplete（CC。ポーリング）へ渡す。
 * 注文番号が無い・見つからないときは 404 ではなく注文一覧へ戻す（決済の途中で迷子にしないため）。
 */
export default async function CheckoutCompletePage({ searchParams }: PageProps) {
  const { order: orderNumber, redirect_status: redirectStatus } = await searchParams;
  if (!orderNumber) redirect("/account/orders");

  const { token } = await requireAuth(`/checkout/complete?order=${orderNumber}`);
  const order = await getMyOrder(token, orderNumber);
  if (!order) redirect("/account/orders");

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col justify-center px-6 py-16">
      <CheckoutComplete initial={order} redirectStatus={redirectStatus ?? null} />
    </div>
  );
}
