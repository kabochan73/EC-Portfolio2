<?php

namespace App\Actions\Order;

/**
 * カート明細1行の入力（POST /api/orders の items[]）。
 */
final readonly class CartLineInput
{
    public function __construct(
        public int $variantId,
        public int $quantity,
    ) {}
}
