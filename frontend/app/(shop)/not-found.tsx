import Link from "next/link";

// (shop) 配下の notFound() 用（商品詳細の 404 など。docs/08 §11）。
export default function ShopNotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-6 text-center">
      <p className="text-4xl font-medium tracking-[0.2em]">404</p>
      <p className="mt-4 text-xs tracking-[0.2em] text-graphite uppercase">Page not found</p>
      <Link
        href="/"
        className="mt-8 border border-ink px-6 py-3 text-xs tracking-[0.2em] uppercase transition-opacity hover:opacity-60"
      >
        Continue Shopping
      </Link>
    </div>
  );
}
