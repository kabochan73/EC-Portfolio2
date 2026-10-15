<?php

use App\Domain\Order\ShippingFeeCalculator;

// config('shop'): shipping_fee = 800 / free_shipping_threshold = 20000

it('charges the flat fee below the free-shipping threshold', function () {
    $calc = new ShippingFeeCalculator;

    expect($calc->for(0))->toBe(800)
        ->and($calc->for(19_999))->toBe(800);
});

it('is free at or above the threshold', function () {
    $calc = new ShippingFeeCalculator;

    expect($calc->for(20_000))->toBe(0)
        ->and($calc->for(20_001))->toBe(0)
        ->and($calc->for(999_999))->toBe(0);
});
