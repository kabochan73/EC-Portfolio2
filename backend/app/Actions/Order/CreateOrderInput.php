<?php

namespace App\Actions\Order;

use App\Http\Requests\Order\StoreOrderRequest;

/**
 * 注文作成の入力（docs/06-laravel-design.md §3）。
 */
final readonly class CreateOrderInput
{
    /**
     * @param  list<CartLineInput>  $items
     */
    public function __construct(
        public array $items,
        public ?int $addressId,
        public ?ShippingAddressInput $newAddress,
        public bool $saveAddress,
    ) {}

    public static function fromRequest(StoreOrderRequest $request): self
    {
        $validated = $request->validated();

        $items = array_map(
            fn (array $line) => new CartLineInput((int) $line['variant_id'], (int) $line['quantity']),
            $validated['items'],
        );

        return new self(
            items: $items,
            addressId: isset($validated['address_id']) ? (int) $validated['address_id'] : null,
            newAddress: isset($validated['address'])
                ? ShippingAddressInput::fromArray($validated['address'])
                : null,
            saveAddress: (bool) ($validated['save_address'] ?? false),
        );
    }

    /** @return list<int> */
    public function variantIds(): array
    {
        return array_values(array_unique(array_map(fn (CartLineInput $line) => $line->variantId, $this->items)));
    }
}
