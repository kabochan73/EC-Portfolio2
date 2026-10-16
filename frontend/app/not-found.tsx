import Link from "next/link";

// どのグループにも当たらない URL の 404（ヘッダーもサイドバーも無い素の画面）。
// (shop) 配下の notFound() は app/(shop)/not-found.tsx、/admin 配下は app/admin/not-found.tsx が先に当たる
export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      <p className="text-4xl font-medium tracking-[0.2em]">404</p>
      <p className="mt-4 text-xs tracking-[0.2em] text-graphite uppercase">Page not found</p>
      <Link
        href="/"
        className="mt-8 border border-ink px-6 py-3 text-xs tracking-[0.2em] uppercase transition-opacity hover:opacity-60"
      >
        Home
      </Link>
    </div>
  );
}
