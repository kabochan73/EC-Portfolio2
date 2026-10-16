import type { Metadata } from "next";

import RegisterForm from "@/components/auth/RegisterForm";

export const metadata: Metadata = { title: "Register" };

type PageProps = { searchParams: Promise<{ redirect?: string }> };

/** 会員登録（Server Component）。?redirect= はここで読んで props で渡す（docs/08 §3.6） */
export default async function RegisterPage({ searchParams }: PageProps) {
  const { redirect } = await searchParams;

  return <RegisterForm redirectTo={redirect ?? null} />;
}
