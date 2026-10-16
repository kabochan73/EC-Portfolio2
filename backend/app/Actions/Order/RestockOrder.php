<?php

namespace App\Actions\Order;

use App\Models\Order;
use App\Models\ProductVariant;
use Illuminate\Support\Facades\DB;

/**
 * 注文の在庫を戻す（キャンセル時。docs/02 の state machine）。
 * 明細の product_variant_id ごとに stock を quantity 分だけ増やす。
 * variant が削除済み（SET NULL）の明細はスキップ。
 *
 * ロックは CreateOrder と同じく id 昇順でまとめて取る（R4 修正）。R3 は明細の順に 1 行ずつ
 * ロックしていたため、キャンセルと新規注文が同時に走ると互いを待ち合うデッドロックがありえた
 */
final class RestockOrder
{
    public function execute(Order $order): void
    {
        DB::transaction(function () use ($order) {
            $order->loadMissing('items');

            // variant ごとの戻す数量（同じ variant の明細は無いはずだが、念のため合算する）
            $quantities = $order->items
                ->whereNotNull('product_variant_id')
                ->groupBy('product_variant_id')
                ->map(fn ($items) => (int) $items->sum('quantity'));

            if ($quantities->isEmpty()) {
                return;
            }

            $variants = ProductVariant::query()
                ->whereIn('id', $quantities->keys())
                ->orderBy('id')
                ->lockForUpdate()
                ->get();

            foreach ($variants as $variant) {
                $variant->increment('stock', $quantities[$variant->id]);
            }
        });
    }
}
