"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";

import SizeChartEditor, { type SizeChartEditorHandle } from "@/components/admin/SizeChartEditor";
import Field from "@/components/ui/Field";
import { applyLaravelErrors } from "@/lib/form-errors";
import { adminProductSchema, type AdminProductFormValues, type AdminProductPayload } from "@/lib/schemas/adminProduct";
import type { AdminCategory, AdminProduct } from "@/lib/types";

type Props = {
  categories: AdminCategory[];
  /** 編集時は既存の商品。新規作成は undefined */
  product?: AdminProduct;
  /** BFF に送って Response を返す。エラーの割り当てはこのフォームが行う（AddressForm と同じ形） */
  onSubmit: (payload: AdminProductPayload) => Promise<Response>;
  /** 保存に成功したとき（BFF の返した Response を渡す。新規作成は id を読んで編集ページへ） */
  onSaved: (res: Response) => void | Promise<void>;
  submitLabel: string;
};

const labelClass = "block text-[11px] tracking-widest text-graphite uppercase";
const textareaClass = "mt-2 w-full border border-ink bg-transparent p-2 text-sm outline-none";

/**
 * 商品の「基本情報」フォーム（新規作成・編集で共用。docs/05-admin.md）。画像・バリアントは別の部品。
 * R4: slug の重複などの 422 は入力欄の下に出す（R3 はフォームの上に message を 1 行）
 */
export default function ProductForm({ categories, product, onSubmit, onSaved, submitLabel }: Props) {
  const sizeChartRef = useRef<SizeChartEditorHandle>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<AdminProductFormValues>({
    resolver: zodResolver(adminProductSchema),
    defaultValues: product
      ? {
          category_id: product.category_id,
          name: product.name,
          slug: product.slug,
          price: product.price,
          description: product.description,
          material: product.material,
          care: product.care ?? "",
          origin: product.origin,
          product_code: product.product_code,
          is_published: product.is_published,
          position: product.position,
        }
      : { category_id: categories[0]?.id, is_published: false, position: 0 },
  });

  async function submit(values: AdminProductFormValues) {
    setServerError(null);
    const size_chart = sizeChartRef.current?.getValue() ?? null;
    const res = await onSubmit({ ...values, care: values.care || null, size_chart });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      const message = applyLaravelErrors(body, setError, "保存できませんでした。");
      // size_chart.* のエラーは入力欄と 1 対 1 にならないので、下にまとめて出す
      const sizeChartKey = Object.keys(body?.errors ?? {}).find((key) => key.startsWith("size_chart"));
      setServerError(sizeChartKey ? `サイズ表: ${body.errors[sizeChartKey][0]}` : message);
      return;
    }

    await onSaved(res);
  }

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="max-w-2xl space-y-6">
      <div>
        <label htmlFor="category_id" className={labelClass}>
          Category
        </label>
        <select
          id="category_id"
          className="mt-2 w-full border-b border-ink bg-transparent py-2 text-sm outline-none"
          {...register("category_id")}
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        {errors.category_id && <p className="mt-1 text-xs text-graphite">{errors.category_id.message}</p>}
      </div>

      <Field label="Name" id="name" error={errors.name?.message} {...register("name")} />
      <Field label="Slug（例: boxy-cotton-t-shirt）" id="slug" error={errors.slug?.message} {...register("slug")} />
      <Field label="Price（円・税込）" id="price" type="number" error={errors.price?.message} {...register("price")} />

      <div>
        <label htmlFor="description" className={labelClass}>
          Description
        </label>
        <textarea id="description" rows={4} className={textareaClass} {...register("description")} />
        {errors.description && <p className="mt-1 text-xs text-graphite">{errors.description.message}</p>}
      </div>

      <div>
        <label htmlFor="material" className={labelClass}>
          Material
        </label>
        <textarea id="material" rows={2} className={textareaClass} {...register("material")} />
        {errors.material && <p className="mt-1 text-xs text-graphite">{errors.material.message}</p>}
      </div>

      <div>
        <label htmlFor="care" className={labelClass}>
          Care（任意）
        </label>
        <textarea id="care" rows={2} className={textareaClass} {...register("care")} />
      </div>

      <Field label="Origin" id="origin" error={errors.origin?.message} {...register("origin")} />
      <Field label="Product Code" id="product_code" error={errors.product_code?.message} {...register("product_code")} />
      <Field
        label="Position（表示順。小さいほど前）"
        id="position"
        type="number"
        error={errors.position?.message}
        {...register("position")}
      />

      <label className="flex items-center gap-2 text-[11px] tracking-widest text-graphite uppercase">
        <input type="checkbox" {...register("is_published")} />
        Published
      </label>

      <SizeChartEditor ref={sizeChartRef} initialValue={product?.size_chart ?? null} />

      {serverError && <p className="text-xs text-graphite">{serverError}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-ink px-6 py-3 text-xs tracking-widest text-paper uppercase transition-opacity hover:opacity-80 disabled:opacity-50"
      >
        {isSubmitting ? "..." : submitLabel}
      </button>
    </form>
  );
}
