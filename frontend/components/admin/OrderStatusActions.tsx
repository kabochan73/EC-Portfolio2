"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { OrderStatus } from "@/lib/types";

type Action = { to: OrderStatus; label: string; confirm?: string };

/**
 * 今のステータスで押せるボタン（docs/05「注文詳細ページ」。backend の OrderStatus::transitions() と揃える）。
 * paid にするのは Stripe の Webhook だけなので、管理者のボタンには無い。
 * R4: キャンセルの文言を状態ごとに分けた（R3 はどれも「Cancel Order」で、返金されるのか分からなかった）
 */
const ACTIONS: Record<OrderStatus, Action[]> = {
  pending: [{ to: "cancelled", label: "Cancel Order", confirm: "この注文をキャンセルし、在庫を戻します。よろしいですか？" }],
  paid: [
    { to: "shipped", label: "Mark as Shipped" },
    {
      to: "cancelled",
      label: "Cancel & Refund",
      confirm: "この注文をキャンセルします（Stripe で返金し、在庫を戻します）。よろしいですか？",
    },
  ],
  shipped: [
    { to: "completed", label: "Mark as Completed" },
    { to: "cancelled", label: "Cancel", confirm: "発送済みの注文をキャンセルします（返品扱い・在庫は戻しません）。よろしいですか？" },
  ],
  completed: [],
  cancelled: [],
};

export default function OrderStatusActions({ orderNumber, status }: { orderNumber: string; status: OrderStatus }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState<OrderStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const actions = ACTIONS[status];
  if (actions.length === 0) {
    return <p className="text-[11px] tracking-widest text-graphite uppercase">この注文はこれ以上変更できません。</p>;
  }

  async function run(action: Action) {
    if (action.confirm && !window.confirm(action.confirm)) return;

    setSubmitting(action.to);
    setError(null);
    const res = await fetch(`/bff/admin/orders/${orderNumber}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: action.to }),
    });
    setSubmitting(null);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.message ?? "ステータスを変更できませんでした。");
      return;
    }
    startTransition(() => router.refresh());
  }

  const busy = submitting !== null || pending;

  return (
    <div>
      {error && <p className="mb-3 text-xs text-graphite">{error}</p>}
      <div className="flex flex-wrap gap-3">
        {actions.map((action) => (
          <button
            key={action.to}
            type="button"
            onClick={() => run(action)}
            disabled={busy}
            className={`px-6 py-3 text-xs tracking-widest uppercase transition-colors disabled:opacity-50 ${
              action.to === "cancelled" ? "border border-ink hover:bg-mist" : "bg-ink text-paper hover:opacity-80"
            }`}
          >
            {submitting === action.to || (pending && !submitting) ? "..." : action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
