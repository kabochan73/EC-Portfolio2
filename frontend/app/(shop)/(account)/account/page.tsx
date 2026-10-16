import type { Metadata } from "next";

import LogoutButton from "@/components/account/LogoutButton";
import { requireAuth } from "@/lib/auth";

export const metadata: Metadata = { title: "Account" };

/**
 * マイページ（Server Component）。Step 36 はログイン後の行き先として名前と LOGOUT だけ。
 * 注文履歴・住所録・プロフィールへのメニューは Step 38・39 で足す。
 */
export default async function AccountPage() {
  const { user } = await requireAuth("/account");

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-medium tracking-[0.15em] uppercase">Account</h1>
      <p className="mt-4 text-sm text-graphite">ようこそ、{user.name} さん</p>

      <div className="mt-12 border-t border-ink pt-6">
        <LogoutButton />
      </div>
    </div>
  );
}
