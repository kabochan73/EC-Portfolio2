<?php

namespace App\Domain\Order;

/**
 * 送料の計算（docs/02-database-design.md / docs/06-laravel-design.md §3）。
 * Eloquent 非依存の純粋ロジック。注文作成時と PaymentIntent 作成時の両方で使う。
 */
final class ShippingFeeCalculator
{
    public function for(int $subtotal): int
    {
        return $subtotal >= (int) config('shop.free_shipping_threshold')
            ? 0
            : (int) config('shop.shipping_fee');
    }
}
