<?php

namespace App\Enums;

enum StockStatus: string
{
    case SoldOut = 'sold_out';
    case LowStock = 'low_stock';
    case InStock = 'in_stock';

    /**
     * 在庫数から表示ステータスを判定する（docs/02-database-design.md）。
     * 閾値はアプリ定数（config('shop.low_stock_threshold')）。
     */
    public static function fromStock(int $stock): self
    {
        return match (true) {
            $stock <= 0 => self::SoldOut,
            $stock <= config('shop.low_stock_threshold') => self::LowStock,
            default => self::InStock,
        };
    }

    /** 複数 variant の在庫合算から、商品カード用のステータスを判定する */
    public static function fromTotalStock(int $totalStock): self
    {
        return self::fromStock($totalStock);
    }

    public function label(): string
    {
        return match ($this) {
            self::SoldOut => 'SOLD OUT',
            self::LowStock => '残りわずか',
            self::InStock => '在庫あり',
        };
    }

    public function selectable(): bool
    {
        return $this !== self::SoldOut;
    }
}
