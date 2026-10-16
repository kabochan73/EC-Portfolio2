import { apiFetch, bearerJson } from "@/lib/api";
import type { ApiResource, PaymentIntentResponse } from "@/lib/types";

/**
 * POST /api/checkout/payment-intent … 注文の PaymentIntent を作成 or 再利用し、
 * client_secret と publishable_key を返す（docs/09-payments-stripe.md）。サーバー専用。
 *
 * 冪等: 同じ注文なら同じ PaymentIntent（backend が注文を行ロックするので同時に呼ばれても 1 つ）。
 * - pending 以外の注文 / カタログ価格が変わった → 409
 * - Stripe 未設定（実キー未投入）→ 503
 */
export async function createPaymentIntent(
  token: string,
  orderNumber: string,
): Promise<PaymentIntentResponse> {
  const res = await apiFetch<ApiResource<PaymentIntentResponse>>(
    "/api/checkout/payment-intent",
    bearerJson(token, "POST", { order_number: orderNumber }),
  );
  return res.data;
}
