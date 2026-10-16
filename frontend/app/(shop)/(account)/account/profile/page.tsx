import type { Metadata } from "next";
import Link from "next/link";

import PasswordForm from "@/components/account/PasswordForm";
import ProfileForm from "@/components/account/ProfileForm";
import { requireAuth } from "@/lib/auth";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const { user } = await requireAuth("/account/profile");

  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <nav className="mb-8 text-[11px] tracking-widest text-graphite uppercase">
        <Link href="/account" className="hover:text-ink">
          Account
        </Link>
        <span className="mx-2">/</span>
        <span>Profile</span>
      </nav>

      <h1 className="mb-8 text-2xl font-medium tracking-[0.15em] uppercase">Profile</h1>

      <section>
        <h2 className="mb-6 text-[11px] tracking-widest text-graphite uppercase">
          氏名・メールアドレス
        </h2>
        <ProfileForm user={user} />
      </section>

      <section className="mt-16 border-t border-ink pt-12">
        <h2 className="mb-6 text-[11px] tracking-widest text-graphite uppercase">
          パスワード変更
        </h2>
        <PasswordForm />
      </section>
    </div>
  );
}
