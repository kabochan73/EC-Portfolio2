import type { Metadata } from "next";
import Link from "next/link";

import NewProductForm from "@/components/admin/NewProductForm";
import { fetchAdminCategories } from "@/lib/admin/categories";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "New Product" };

/** 商品の新規作成（Server Component。カテゴリの選択肢を取ってフォームに渡す） */
export default async function NewProductPage() {
  const { token } = await requireAdmin("/admin/products/new");
  const categories = await fetchAdminCategories(token);

  return (
    <div>
      <nav className="mb-6 text-[11px] tracking-widest text-graphite uppercase">
        <Link href="/admin/products" className="hover:text-ink">
          Products
        </Link>
        <span className="mx-2">/</span>
        <span>New</span>
      </nav>
      <h1 className="mb-8 text-xl tracking-widest uppercase">New Product</h1>
      <NewProductForm categories={categories} />
    </div>
  );
}
