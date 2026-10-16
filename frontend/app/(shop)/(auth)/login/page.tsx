import type { Metadata } from "next";

import LoginForm from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "Login" };

type PageProps = { searchParams: Promise<{ redirect?: string; reset?: string }> };

/**
 * ログイン（Server Component）。?redirect= / ?reset= はここで読んで props で渡す
 * （docs/08 §3.6。R3 はフォーム側で useSearchParams を使い、そのために Suspense で包んでいた）。
 */
export default async function LoginPage({ searchParams }: PageProps) {
  const { redirect, reset } = await searchParams;

  return <LoginForm redirectTo={redirect ?? null} justReset={reset === "1"} />;
}
