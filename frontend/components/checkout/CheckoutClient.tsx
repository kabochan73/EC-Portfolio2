"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import AddressPicker from "@/components/checkout/AddressPicker";
import OrderReview from "@/components/checkout/OrderReview";
import { summarizeCart } from "@/lib/cart-summary";
import { useCartValidation } from "@/lib/hooks/useCartValidation";
import { addressSchema, type AddressFormValues } from "@/lib/schemas/address";
import { useCartHydrated, useCartStore } from "@/lib/stores/cart";
import type { Address, ApiResource, CreateOrderRequest, OrderDetail } from "@/lib/types";

/**
 * チェックアウト（Client Component。カートは localStorage にあるため）。
 * 住所録の一覧は page.tsx（SC）が取って props で渡す。
 * 「Place Order」で pending 注文を作り（在庫を確保）、決済の画面へ進む。カートは決済が完了するまで残す。
 */
export default function CheckoutClient({ addresses }: { addresses: Address[] }) {
  const router = useRouter();
  const hydrated = useCartHydrated();
  const items = useCartStore((state) => state.items);
  const { getValidation } = useCartValidation(items);

  const defaultAddress = addresses.find((a) => a.is_default) ?? addresses[0];
  const [useNew, setUseNew] = useState(addresses.length === 0);
  const [selectedId, setSelectedId] = useState<number | null>(defaultAddress?.id ?? null);
  const [saveAddress, setSaveAddress] = useState(true);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    trigger,
    getValues,
    setError,
    formState: { errors },
  } = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: { is_default: false },
  });

  // 復元前は items が空なので、「空のカート」を出さない（R4。カートページと同じ）
  if (!hydrated) {
    return <p className="py-24 text-center text-xs tracking-[0.2em] text-graphite uppercase">Loading…</p>;
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto flex min-h-[40vh] max-w-md flex-col items-center justify-center px-6 text-center">
        <p className="text-xs tracking-[0.2em] text-graphite uppercase">Your cart is empty</p>
        <Link
          href="/"
          className="mt-8 border border-ink px-6 py-3 text-xs tracking-[0.2em] uppercase transition-opacity hover:opacity-60"
        >
          Continue Shopping
        </Link>
      </div>
    );
  }

  const totals = summarizeCart(items, getValidation);

  async function placeOrder() {
    setServerError(null);

    const lines = items.map((item) => ({ variant_id: item.variantId, quantity: item.quantity }));
    let payload: CreateOrderRequest;

    if (useNew) {
      if (!(await trigger())) return;
      // is_default は住所録用の項目なので注文には送らない
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { is_default, ...address } = getValues();
      payload = { items: lines, address, save_address: saveAddress };
    } else {
      if (selectedId === null) {
        setServerError("配送先を選択してください。");
        return;
      }
      payload = { items: lines, address_id: selectedId };
    }

    setSubmitting(true);
    try {
      const res = await fetch("/bff/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          errors?: Record<string, string[]>;
          message?: string;
        } | null;
        // 新しい住所の検証エラーは "address.city" の形で返るので、入力欄に割り当てる
        for (const [key, messages] of Object.entries(body?.errors ?? {})) {
          const field = key.startsWith("address.") ? key.slice("address.".length) : key;
          if (field in addressSchema.shape) {
            setError(field as keyof AddressFormValues, { message: messages[0] });
          }
        }
        setServerError(body?.message ?? "注文を作成できませんでした。");
        return;
      }

      const body = (await res.json()) as ApiResource<OrderDetail>;
      router.push(`/checkout/payment?order=${body.data.order_number}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-12 md:grid-cols-[1fr_22rem] md:items-start">
      <div>
        <h2 className="mb-6 text-[11px] tracking-widest text-graphite uppercase">配送先</h2>
        <AddressPicker
          addresses={addresses}
          selectedId={selectedId}
          onSelectExisting={(id) => {
            setUseNew(false);
            setSelectedId(id);
          }}
          useNew={useNew}
          onUseNew={() => setUseNew(true)}
          register={register}
          errors={errors}
          saveAddress={saveAddress}
          onSaveAddressChange={setSaveAddress}
        />
      </div>

      <div className="space-y-4 md:sticky md:top-20">
        <OrderReview items={items} getValidation={getValidation} totals={totals} />

        {totals.blocked ? (
          <div className="border border-ink p-4 text-center text-xs tracking-widest text-graphite uppercase">
            <p>購入できない明細があります</p>
            <Link href="/cart" className="mt-2 inline-block underline hover:text-ink">
              カートを見直す
            </Link>
          </div>
        ) : (
          <button
            type="button"
            onClick={placeOrder}
            disabled={submitting}
            className="block w-full bg-ink py-3 text-center text-xs tracking-widest text-paper uppercase transition-opacity hover:opacity-80 disabled:opacity-50"
          >
            {submitting ? "..." : "Place Order"}
          </button>
        )}

        {serverError && <p className="text-xs text-graphite">{serverError}</p>}
        <p className="text-[11px] tracking-wide text-graphite">
          「Place Order」で注文を確保し、次の画面でお支払いに進みます。
        </p>
      </div>
    </div>
  );
}
