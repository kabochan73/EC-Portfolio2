"use client";

import { Elements } from "@stripe/react-stripe-js";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { useMemo } from "react";

type Props = {
  publishableKey: string;
  clientSecret: string;
  children: React.ReactNode;
};

/**
 * Stripe Payment Element の土台（docs/09-payments-stripe.md）。
 * publishable_key と client_secret は payment-intent API のレスポンス由来。
 * 外観はサイトのモノトーンに合わせる（角丸なし・黒基調）。
 */
export default function StripeProvider({ publishableKey, clientSecret, children }: Props) {
  const stripePromise = useMemo<Promise<Stripe | null>>(
    () => loadStripe(publishableKey),
    [publishableKey],
  );

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: "flat",
          variables: {
            colorPrimary: "#000000",
            colorBackground: "#ffffff",
            colorText: "#000000",
            colorDanger: "#000000",
            fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
            borderRadius: "0px",
            spacingUnit: "4px",
            fontSizeBase: "14px",
          },
        },
      }}
    >
      {children}
    </Elements>
  );
}
