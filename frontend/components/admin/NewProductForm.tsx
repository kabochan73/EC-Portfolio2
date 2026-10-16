"use client";

import { useRouter } from "next/navigation";

import ProductForm from "@/components/admin/ProductForm";
import type { AdminCategory, AdminProduct, ApiResource } from "@/lib/types";

/** 新規作成。作れたら編集ページへ（画像・バリアントはそこで足す） */
export default function NewProductForm({ categories }: { categories: AdminCategory[] }) {
  const router = useRouter();

  return (
    <ProductForm
      categories={categories}
      submitLabel="Create"
      onSubmit={(payload) =>
        fetch("/bff/admin/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      }
      onSaved={async (res) => {
        const body: ApiResource<AdminProduct> = await res.json();
        router.push(`/admin/products/${body.data.id}`);
      }}
    />
  );
}
