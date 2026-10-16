"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import Field from "@/components/ui/Field";
import { applyLaravelErrors } from "@/lib/form-errors";
import { adminCategorySchema, type AdminCategoryFormValues } from "@/lib/schemas/adminCategory";
import type { AdminCategory } from "@/lib/types";

type Props = {
  /** 編集時は既存カテゴリ、新規作成時は undefined */
  initialValues?: AdminCategory;
  /** BFF に送って Response を返す。エラーの割り当てはこのフォームが行う（AddressForm と同じ形） */
  onSubmit: (values: AdminCategoryFormValues) => Promise<Response>;
  onSaved: () => void;
  onCancel: () => void;
};

/**
 * カテゴリの追加・編集で共用するフォーム。position は扱わない
 * （新規は末尾に追加、既存は一覧の ▲▼ で変更 = CategoryManager の役目）。
 * slug の重複など Laravel の 422 は入力欄の下に出す（R4。R3 は画面上に 1 行出すだけだった）
 */
export default function CategoryForm({ initialValues, onSubmit, onSaved, onCancel }: Props) {
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<AdminCategoryFormValues>({
    resolver: zodResolver(adminCategorySchema),
    defaultValues: initialValues ? { name: initialValues.name, slug: initialValues.slug } : undefined,
  });

  async function submit(values: AdminCategoryFormValues) {
    setServerError(null);
    const res = await onSubmit(values);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setServerError(applyLaravelErrors(body, setError, "保存できませんでした。"));
      return;
    }

    onSaved();
  }

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="mt-4 space-y-4 border border-ink p-6">
      <Field label="Name" id="name" error={errors.name?.message} {...register("name")} />
      <Field label="Slug（例: tops）" id="slug" placeholder="tops" error={errors.slug?.message} {...register("slug")} />

      {serverError && <p className="text-xs text-graphite">{serverError}</p>}

      <div className="flex gap-4 pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-ink px-6 py-3 text-xs tracking-widest text-paper uppercase transition-opacity hover:opacity-80 disabled:opacity-50"
        >
          {isSubmitting ? "..." : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="border border-ink px-6 py-3 text-xs tracking-widest uppercase transition-colors hover:bg-mist"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
