"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import AddressForm from "@/components/account/AddressForm";
import ShippingAddress from "@/components/order/ShippingAddress";
import type { AddressFormValues } from "@/lib/schemas/address";
import type { Address } from "@/lib/types";

function sendJson(url: string, method: string, values: AddressFormValues): Promise<Response> {
  return fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });
}

/**
 * 住所録の操作（Client Component）。一覧は page.tsx（SC）が取って props で渡し、
 * 追加・編集・削除・★の後は router.refresh() でサーバーに描き直してもらう
 * （docs/08 §3.6。R4。R3 は TanStack Query の initialData + 取り直し専用の GET /bff/addresses を使っていた）。
 */
export default function AddressBook({ addresses }: { addresses: Address[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<"list" | "new" | number>("list"); // number = 編集中の id
  const [pending, startTransition] = useTransition();

  function refresh() {
    setMode("list");
    startTransition(() => router.refresh());
  }

  async function act(url: string, method: "POST" | "DELETE") {
    const res = await fetch(url, { method });
    if (res.ok) {
      refresh();
    }
  }

  return (
    <div className={`space-y-6 ${pending ? "opacity-60" : ""}`}>
      {mode === "new" ? (
        <AddressForm
          onSubmit={(values) => sendJson("/bff/addresses", "POST", values)}
          onSaved={refresh}
          onCancel={() => setMode("list")}
        />
      ) : (
        <button
          type="button"
          onClick={() => setMode("new")}
          className="border border-ink px-6 py-2 text-xs tracking-widest uppercase hover:bg-mist"
        >
          Add Address
        </button>
      )}

      <ul className="space-y-4">
        {addresses.map((address) =>
          mode === address.id ? (
            <li key={address.id}>
              <AddressForm
                address={address}
                onSubmit={(values) => sendJson(`/bff/addresses/${address.id}`, "PUT", values)}
                onSaved={refresh}
                onCancel={() => setMode("list")}
              />
            </li>
          ) : (
            <li key={address.id} className="border border-ink p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  {address.is_default && (
                    <span className="mb-2 inline-block border border-ink px-2 py-0.5 text-[10px] tracking-widest uppercase">
                      Default
                    </span>
                  )}
                  <ShippingAddress address={address} />
                </div>
                <div className="flex flex-col items-end gap-2 text-[10px] tracking-widest uppercase">
                  <button type="button" onClick={() => setMode(address.id)} className="hover:opacity-60">
                    Edit
                  </button>
                  {!address.is_default && (
                    <button
                      type="button"
                      onClick={() => act(`/bff/addresses/${address.id}/default`, "POST")}
                      className="hover:opacity-60"
                    >
                      Set Default
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => act(`/bff/addresses/${address.id}`, "DELETE")}
                    className="text-graphite hover:text-ink"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ),
        )}
      </ul>

      {addresses.length === 0 && mode !== "new" && (
        <p className="text-sm text-graphite">登録済みの住所はありません。</p>
      )}
    </div>
  );
}
