import Link from "next/link";

import LogoutButton from "@/components/account/LogoutButton";

/**
 * マイページのメニュー（docs/01-sitemap-pages.md）。
 * admin なら ADMIN PANEL も出す（Laravel 側で /api/admin/* の認可もあるので表示だけ）。
 */
export default function AccountMenu({ isAdmin }: { isAdmin: boolean }) {
  return (
    <nav className="mt-12 flex flex-col gap-4 border-t border-ink pt-8">
      <Link
        href="/account/orders"
        className="text-xs tracking-widest text-graphite uppercase transition-colors hover:text-ink"
      >
        Orders
      </Link>
      <Link
        href="/account/addresses"
        className="text-xs tracking-widest text-graphite uppercase transition-colors hover:text-ink"
      >
        Addresses
      </Link>
      <Link
        href="/account/profile"
        className="text-xs tracking-widest text-graphite uppercase transition-colors hover:text-ink"
      >
        Profile
      </Link>
      {isAdmin && (
        <Link
          href="/admin"
          className="text-xs tracking-widest text-graphite uppercase transition-colors hover:text-ink"
        >
          Admin Panel
        </Link>
      )}
      <LogoutButton />
    </nav>
  );
}
