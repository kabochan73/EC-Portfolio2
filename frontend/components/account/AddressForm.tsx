"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import AddressFields from "@/components/account/AddressFields";
import { applyLaravelErrors } from "@/lib/form-errors";
import { addressSchema, type AddressFormValues } from "@/lib/schemas/address";
import type { Address } from "@/lib/types";

type Props = {
  /** 編集時は既存の住所。新規は undefined */
  address?: Address;
  /** BFF に送って Response を返す。エラーの割り当てはこのフォームが行う */
  onSubmit: (values: AddressFormValues) => Promise<Response>;
  /** 保存に成功したとき */
  onSaved: () => void;
  onCancel: () => void;
};

export default function AddressForm({ address, onSubmit, onSaved, onCancel }: Props) {
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: address
      ? {
          recipient_name: address.recipient_name,
          postal_code: address.postal_code,
          prefecture: address.prefecture,
          city: address.city,
          address_line1: address.address_line1,
          address_line2: address.address_line2 ?? "",
          phone: address.phone,
          is_default: address.is_default,
        }
      : { is_default: false },
  });

  async function submit(values: AddressFormValues) {
    setServerError(null);

    // address_line2 の空文字は Laravel（ConvertEmptyStringsToNull）が null にするので、ここでは変換しない
    const res = await onSubmit(values);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setServerError(applyLaravelErrors(body, setError, "保存できませんでした。"));
      return;
    }

    onSaved();
  }

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="space-y-5 border border-ink p-6">
      <AddressFields register={register} errors={errors} />

      <label className="flex items-center gap-2 text-xs tracking-widest text-graphite uppercase">
        <input type="checkbox" className="accent-ink" {...register("is_default")} />
        デフォルトにする
      </label>

      {serverError && <p className="text-xs text-graphite">{serverError}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-ink px-6 py-2 text-xs tracking-widest text-paper uppercase hover:opacity-80 disabled:opacity-50"
        >
          {isSubmitting ? "..." : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="border border-ink px-6 py-2 text-xs tracking-widest uppercase hover:bg-mist"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
