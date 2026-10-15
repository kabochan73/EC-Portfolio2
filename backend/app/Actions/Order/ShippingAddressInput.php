<?php

namespace App\Actions\Order;

/**
 * 新規配送先の入力（POST /api/orders の address）。
 * orders の ship_* スナップショット、および save_address 時の addresses 行の両方に使う。
 */
final readonly class ShippingAddressInput
{
    public function __construct(
        public string $recipientName,
        public string $postalCode,
        public string $prefecture,
        public string $city,
        public string $addressLine1,
        public ?string $addressLine2,
        public string $phone,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public static function fromArray(array $data): self
    {
        return new self(
            recipientName: $data['recipient_name'],
            postalCode: $data['postal_code'],
            prefecture: $data['prefecture'],
            city: $data['city'],
            addressLine1: $data['address_line1'],
            addressLine2: $data['address_line2'] ?? null,
            phone: $data['phone'],
        );
    }

    /** @return array<string, mixed> orders の ship_* 列 */
    public function toOrderShipAttributes(): array
    {
        return [
            'ship_recipient_name' => $this->recipientName,
            'ship_postal_code' => $this->postalCode,
            'ship_prefecture' => $this->prefecture,
            'ship_city' => $this->city,
            'ship_address_line1' => $this->addressLine1,
            'ship_address_line2' => $this->addressLine2,
            'ship_phone' => $this->phone,
        ];
    }

    /** @return array<string, mixed> addresses テーブルの列 */
    public function toAddressAttributes(): array
    {
        return [
            'recipient_name' => $this->recipientName,
            'postal_code' => $this->postalCode,
            'prefecture' => $this->prefecture,
            'city' => $this->city,
            'address_line1' => $this->addressLine1,
            'address_line2' => $this->addressLine2,
            'phone' => $this->phone,
        ];
    }
}
