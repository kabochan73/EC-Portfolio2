"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import ProductForm from "@/components/admin/ProductForm";
import type { AdminCategory, AdminProduct } from "@/lib/types";

type Props = { product: AdminProduct; categories: AdminCategory[] };

/** 商品の基本情報の編集 + 商品の削除。保存したら router.refresh() で描き直す */
export default function EditProductForm({ product, categories }: Props) {
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!window.confirm(`「${product.name}」を削除しますか？この操作は取り消せません。`)) return;
    setError(null);
    const res = await fetch(`/bff/admin/products/${product.id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.message ?? "削除に失敗しました。");
      return;
    }
    router.push("/admin/products");
  }

  return (
    <div>
      {notice && <p className="mb-6 text-xs text-graphite">{notice}</p>}
      <ProductForm
        categories={categories}
        product={product}
        submitLabel="Save"
        onSubmit={(payload) => {
          setNotice(null);
          return fetch(`/bff/admin/products/${product.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        }}
        onSaved={() => {
          setNotice("保存しました。");
          router.refresh();
        }}
      />

      {error && <p className="mt-6 text-xs text-graphite">{error}</p>}
      <button
        type="button"
        onClick={handleDelete}
        className="mt-6 text-xs tracking-widest text-graphite uppercase underline underline-offset-2 hover:text-ink"
      >
        Delete Product
      </button>
    </div>
  );
}
