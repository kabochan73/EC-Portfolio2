"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/content", label: "Content" },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="-mx-1 flex gap-1 overflow-x-auto px-1 text-xs tracking-widest uppercase md:mx-0 md:flex-col md:overflow-visible md:px-0">
      {NAV_ITEMS.map((item) => {
        const active =
          item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap px-2 py-2 transition-colors ${
              active ? "bg-ink text-paper" : "hover:bg-mist"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
