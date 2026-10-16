import type { FieldErrors, UseFormRegister } from "react-hook-form";

import AddressFields from "@/components/account/AddressFields";
import ShippingAddress from "@/components/order/ShippingAddress";
import type { AddressFormValues } from "@/lib/schemas/address";
import type { Address } from "@/lib/types";

type Props = {
  addresses: Address[];
  /** 既存の住所を選択中ならその id。新規入力中は null */
  selectedId: number | null;
  onSelectExisting: (id: number) => void;
  useNew: boolean;
  onUseNew: () => void;
  /** 新規入力フォーム（useNew のとき表示） */
  register: UseFormRegister<AddressFormValues>;
  errors: FieldErrors<AddressFormValues>;
  saveAddress: boolean;
  onSaveAddressChange: (value: boolean) => void;
};

/**
 * 配送先の選択（住所録から選ぶ / 新しい住所を入力）。状態は CheckoutClient が持ち、ここは表示だけ
 * （フックを持たないので "use client" は不要。CheckoutClient から使われるのでブラウザで動く）。
 * 住所の表示は ShippingAddress、入力欄は AddressFields を使い回す（R4）。
 */
export default function AddressPicker({
  addresses,
  selectedId,
  onSelectExisting,
  useNew,
  onUseNew,
  register,
  errors,
  saveAddress,
  onSaveAddressChange,
}: Props) {
  return (
    <div className="space-y-4">
      {addresses.map((address) => (
        <label
          key={address.id}
          className={`flex cursor-pointer gap-3 border p-4 ${
            !useNew && selectedId === address.id ? "border-ink" : "border-mist"
          }`}
        >
          <input
            type="radio"
            name="address-choice"
            className="mt-1 accent-ink"
            checked={!useNew && selectedId === address.id}
            onChange={() => onSelectExisting(address.id)}
          />
          <span>
            {address.is_default && (
              <span className="mb-1 inline-block border border-graphite px-1 text-[9px] tracking-widest text-graphite uppercase">
                Default
              </span>
            )}
            <ShippingAddress address={address} />
          </span>
        </label>
      ))}

      <label className={`flex cursor-pointer gap-3 border p-4 text-sm ${useNew ? "border-ink" : "border-mist"}`}>
        <input type="radio" name="address-choice" className="mt-1 accent-ink" checked={useNew} onChange={onUseNew} />
        <span className="tracking-widest uppercase">新しい住所を入力</span>
      </label>

      {useNew && (
        <div className="space-y-5 border border-ink p-6">
          <AddressFields register={register} errors={errors} />
          <label className="flex items-center gap-2 text-xs tracking-widest text-graphite uppercase">
            <input type="checkbox" className="accent-ink" checked={saveAddress} onChange={(e) => onSaveAddressChange(e.target.checked)} />
            この住所を住所録に保存する
          </label>
        </div>
      )}
    </div>
  );
}
