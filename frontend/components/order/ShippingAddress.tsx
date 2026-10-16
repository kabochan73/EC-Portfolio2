import type { ShippingAddressSnapshot } from "@/lib/types";

/**
 * 配送先の表示（R4 で部品化）。マイページの注文詳細・チェックアウトの確認・管理画面の注文詳細で使う
 * （R3 は同じ 7 行の表示を 3 か所に書いていた）。
 */
export default function ShippingAddress({ address }: { address: ShippingAddressSnapshot }) {
  return (
    <p className="text-sm leading-relaxed">
      {address.recipient_name}
      <br />〒{address.postal_code} {address.prefecture}
      {address.city}
      <br />
      {address.address_line1}
      {address.address_line2 ? ` ${address.address_line2}` : ""}
      <br />
      {address.phone}
    </p>
  );
}
