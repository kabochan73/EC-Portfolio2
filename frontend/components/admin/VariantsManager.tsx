"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import VariantForm from "@/components/admin/VariantForm";
import type { AdminProductVariant } from "@/lib/types";

type Mode = { type: "idle" } | { type: "adding" } | { type: "editing"; id: number };

type Props = { productId: number; variants: AdminProductVariant[] };

function sendJson(url: string, method: string, body: unknown): Promise<Response> {
  return fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

/**
 * バリアント（サイズ × 色 × 在庫）の管理。CategoryManager と同じ形:
 * 一覧は props、操作の後は router.refresh()（R4。R3 は GET の BFF で商品を取り直して variants を差し替えていた）
 */
export default function VariantsManager({ productId, variants }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>({ type: "idle" });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function refresh() {
    setMode({ type: "idle" });
    startTransition(() => router.refresh());
  }

  async function handleDelete(variant: AdminProductVariant) {
    const label = `${variant.size}${variant.color ? ` / ${variant.color}` : ""}`;
    if (!window.confirm(`${label} を削除しますか？`)) return;
    setError(null);
    const res = await fetch(`/bff/admin/variants/${variant.id}?product=${productId}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.message ?? "削除に失敗しました。");
      return;
    }
    refresh();
  }

  const editing = mode.type === "editing" ? variants.find((v) => v.id === mode.id) : undefined;

  return (
    <section className={pending ? "opacity-60" : ""}>
      <h2 className="mb-4 text-[11px] tracking-widest text-graphite uppercase">Variants</h2>
      {error && <p className="mb-4 text-xs text-graphite">{error}</p>}

      {variants.length === 0 ? (
        <p className="text-sm text-graphite">バリアントがありません（在庫がないので商品ページで購入できません）。</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-ink text-left text-[11px] tracking-widest text-graphite uppercase">
                <th className="py-2 pr-4 font-normal">Size</th>
                <th className="py-2 pr-4 font-normal">Color</th>
                <th className="py-2 pr-4 font-normal">SKU</th>
                <th className="py-2 pr-4 font-normal">Stock</th>
                <th className="py-2 font-normal">Actions</th>
              </tr>
            </thead>
            <tbody>
              {variants.map((variant) => (
                <tr key={variant.id} className="border-b border-mist">
                  <td className="py-2 pr-4">{variant.size}</td>
                  <td className="py-2 pr-4 text-graphite">{variant.color ?? "—"}</td>
                  <td className="py-2 pr-4 text-graphite">{variant.sku ?? "—"}</td>
                  <td className="py-2 pr-4">{variant.stock}</td>
                  <td className="py-2">
                    <div className="flex gap-4 text-xs tracking-widest uppercase">
                      <button
                        type="button"
                        onClick={() => setMode({ type: "editing", id: variant.id })}
                        className="underline underline-offset-2 hover:text-graphite"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(variant)}
                        className="underline underline-offset-2 hover:text-graphite"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {mode.type === "editing" && editing ? (
        <VariantForm
          key={editing.id}
          variant={editing}
          onSubmit={({ color, sku, stock }) =>
            sendJson(`/bff/admin/variants/${editing.id}?product=${productId}`, "PUT", { color, sku, stock })
          }
          onSaved={refresh}
          onCancel={() => setMode({ type: "idle" })}
        />
      ) : mode.type === "adding" ? (
        <VariantForm
          onSubmit={(payload) => sendJson(`/bff/admin/products/${productId}/variants`, "POST", payload)}
          onSaved={refresh}
          onCancel={() => setMode({ type: "idle" })}
        />
      ) : (
        <button
          type="button"
          onClick={() => setMode({ type: "adding" })}
          className="mt-6 border border-ink px-6 py-3 text-xs tracking-widest uppercase transition-colors hover:bg-mist"
        >
          Add New Variant
        </button>
      )}
    </section>
  );
}
