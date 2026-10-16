import type { Metadata } from "next";

import AccountMenu from "@/components/account/AccountMenu";
import { requireAuth } from "@/lib/auth";

export const metadata: Metadata = { title: "Account" };

/**
 * マイページ（Server Component。docs/01-sitemap-pages.md）。
 * メール認証は実装しないので、未確認バナーは出さない。
 */
export default async function AccountPage() {
  const { user } = await requireAuth("/account");

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-medium tracking-[0.15em] uppercase">Account</h1>
      <p className="mt-4 text-sm text-graphite">ようこそ、{user.name} さん</p>

      <AccountMenu isAdmin={user.role === "admin"} />
    </div>
  );
}
