"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import Field from "@/components/ui/Field";
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
      <Field label="宛名" id="recipient_name" error={errors.recipient_name?.message} {...register("recipient_name")} />
      <Field label="郵便番号" id="postal_code" placeholder="123-4567" error={errors.postal_code?.message} {...register("postal_code")} />
      <Field label="都道府県" id="prefecture" error={errors.prefecture?.message} {...register("prefecture")} />
      <Field label="市区町村" id="city" error={errors.city?.message} {...register("city")} />
      <Field label="番地" id="address_line1" error={errors.address_line1?.message} {...register("address_line1")} />
      <Field label="建物・部屋番号（任意）" id="address_line2" error={errors.address_line2?.message} {...register("address_line2")} />
      <Field label="電話番号" id="phone" error={errors.phone?.message} {...register("phone")} />

      <label className="flex items-center gap-2 text-xs tracking-widest text-graphite uppercase">
        <input type="checkbox" {...register("is_default")} />
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
