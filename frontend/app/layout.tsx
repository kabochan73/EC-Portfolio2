import type { Metadata } from "next";
import { Geist } from "next/font/google";

import CartHydration from "@/components/providers/CartHydration";
import QueryProvider from "@/components/providers/QueryProvider";

import "./globals.css";

// 「細いサンセリフ」の基調フォント。等幅は使わないので Geist_Mono は入れない（docs/08 §9）。
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "EC-PORTFOLIO",
    template: "%s | EC-PORTFOLIO",
  },
  description: "EC-PORTFOLIO — a minimal, monotone apparel brand.",
};

/**
 * 一番外側のシェル（Server Component）。<html><body> とフォント・globals だけを持つ。
 * 個別レイアウト（(shop) / admin）は children 側に入る。
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${geistSans.variable} font-sans antialiased`}>
        <QueryProvider>
          {/* カートストア（localStorage）の復元をマウント後に走らせる。何も描画しない。 */}
          <CartHydration />
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
