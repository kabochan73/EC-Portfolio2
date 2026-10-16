import Link from "next/link";

// /admin 配下の notFound() 用（存在しない商品 id・注文番号・会員 id）。サイドバーは残る
export default function AdminNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-start justify-center gap-4">
      <p className="text-4xl font-medium tracking-[0.2em]">404</p>
      <p className="text-xs tracking-[0.2em] text-graphite uppercase">Not found</p>
      <Link
        href="/admin"
        className="border border-ink px-6 py-3 text-xs tracking-[0.2em] uppercase transition-colors hover:bg-mist"
      >
        Dashboard
      </Link>
    </div>
  );
}
