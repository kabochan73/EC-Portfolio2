import type { Metadata } from "next";
import { Geist } from "next/font/google";

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
 * TanStack Query の Provider とカートの復元（CartHydration）は、それを使う Step（34 / 36）で足す。
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${geistSans.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
