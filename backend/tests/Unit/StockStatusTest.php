<?php

use App\Enums\StockStatus;

// config('shop.low_stock_threshold') = 5（docs/02-database-design.md）

it('is sold out at zero or below', function () {
    expect(StockStatus::fromStock(0))->toBe(StockStatus::SoldOut)
        ->and(StockStatus::fromStock(-3))->toBe(StockStatus::SoldOut);
});

it('is low stock from 1 up to the threshold', function () {
    expect(StockStatus::fromStock(1))->toBe(StockStatus::LowStock)
        ->and(StockStatus::fromStock(5))->toBe(StockStatus::LowStock);
});

it('is in stock above the threshold', function () {
    expect(StockStatus::fromStock(6))->toBe(StockStatus::InStock)
        ->and(StockStatus::fromStock(999))->toBe(StockStatus::InStock);
});

it('is not selectable only when sold out', function () {
    expect(StockStatus::SoldOut->selectable())->toBeFalse()
        ->and(StockStatus::LowStock->selectable())->toBeTrue()
        ->and(StockStatus::InStock->selectable())->toBeTrue();
});
