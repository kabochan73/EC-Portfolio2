import type { FieldErrors, UseFormRegister } from "react-hook-form";

import Field from "@/components/ui/Field";
import type { AddressFormValues } from "@/lib/schemas/address";

type Props = {
  register: UseFormRegister<AddressFormValues>;
  errors: FieldErrors<AddressFormValues>;
};

/**
 * 住所の入力欄 7 つ（R4 で部品化）。住所録の AddressForm と、チェックアウトの新しい住所の入力で使う
 * （R3 は同じ 7 つの Field を 2 か所に書いていた）。フォームの状態は呼び出し側の useForm が持つ。
 */
export default function AddressFields({ register, errors }: Props) {
  return (
    <>
      <Field label="宛名" id="recipient_name" error={errors.recipient_name?.message} {...register("recipient_name")} />
      <Field
        label="郵便番号"
        id="postal_code"
        placeholder="123-4567"
        error={errors.postal_code?.message}
        {...register("postal_code")}
      />
      <Field label="都道府県" id="prefecture" error={errors.prefecture?.message} {...register("prefecture")} />
      <Field label="市区町村" id="city" error={errors.city?.message} {...register("city")} />
      <Field label="番地" id="address_line1" error={errors.address_line1?.message} {...register("address_line1")} />
      <Field
        label="建物・部屋番号（任意）"
        id="address_line2"
        error={errors.address_line2?.message}
        {...register("address_line2")}
      />
      <Field label="電話番号" id="phone" error={errors.phone?.message} {...register("phone")} />
    </>
  );
}
