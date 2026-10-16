import type { Metadata } from "next";
import Link from "next/link";

import AddressBook from "@/components/account/AddressBook";
import { getAddresses } from "@/lib/addresses";
import { requireAuth } from "@/lib/auth";

export const metadata: Metadata = { title: "Addresses" };

export default async function AddressesPage() {
  const { token } = await requireAuth("/account/addresses");
  const addresses = await getAddresses(token);

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <nav className="mb-8 text-[11px] tracking-widest text-graphite uppercase">
        <Link href="/account" className="hover:text-ink">
          Account
        </Link>
        <span className="mx-2">/</span>
        <span>Addresses</span>
      </nav>

      <h1 className="mb-8 text-2xl font-medium tracking-[0.15em] uppercase">Addresses</h1>
      <AddressBook addresses={addresses} />
    </div>
  );
}
