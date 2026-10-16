"use client";

import { useQuery } from "@tanstack/react-query";
import { useRef } from "react";

import type { ApiResource, OrderDetail } from "@/lib/types";

const POLL_INTERVAL_MS = 2500;
const MAX_POLL_MS = 60_000;

/**
 * /checkout/complete で、Webhook（payment_intent.succeeded）が注文を pending から
 * 動かすのを待つためのポーリング（docs/09-payments-stripe.md）。
 * status が pending でなくなる、または 60 秒経過で停止する。
 */
export function useOrderStatusPolling(orderNumber: string, initial: OrderDetail) {
  const startedAt = useRef(Date.now());

  const { data } = useQuery({
    queryKey: ["order-status", orderNumber],
    initialData: initial,
    queryFn: async (): Promise<OrderDetail> => {
      const res = await fetch(`/bff/orders/${orderNumber}`);
      if (!res.ok) {
        throw new Error(`/bff/orders/${orderNumber} が ${res.status}`);
      }
      const body: ApiResource<OrderDetail> = await res.json();
      return body.data;
    },
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status && status !== "pending") return false;
      if (Date.now() - startedAt.current > MAX_POLL_MS) return false;
      return POLL_INTERVAL_MS;
    },
  });

  const settled = data.status !== "pending";
  const timedOut = !settled && Date.now() - startedAt.current > MAX_POLL_MS;

  return { order: data, settled, timedOut };
}
