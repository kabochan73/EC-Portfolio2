<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\Admin\OrderListResource;
use App\Models\Order;
use App\Models\Product;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    /** 未発送の一覧に出す件数。注文一覧の 1 ページ（20 件）とそろえる。それ以上は「すべて見る」で注文一覧の絞り込みへ */
    private const UNSHIPPED_LIST_LIMIT = 20;

    /**
     * GET /api/admin/stats … 運用ダッシュボード（docs/05-admin.md）。管理者が「次にやること」の数と一覧。
     * R4（2026-10-17 ユーザーの判断）: 注文件数・売上合計・pending 件数・最近の注文 5 件をやめて、
     * 未発送（paid）・受け取り待ち（shipped）の件数と、未発送の注文を古い順に。
     * pending（決済待ち）は 30 分で自動キャンセルされ、管理者がやることが無いので出さない。売上は /admin/sales
     */
    public function stats(): JsonResponse
    {
        $threshold = (int) config('shop.low_stock_threshold');

        // 公開商品を「全 variant の在庫合計」で判定（ProductSummaryResource と同じ考え方）
        $stockTotals = Product::query()
            ->published()
            ->has('variants')
            ->withSum('variants as stock_total', 'stock')
            ->pluck('stock_total')
            ->map(fn ($total) => (int) $total);

        // 未発送は「決済が早いものから」発送するので、決済日時の古い順
        $unshippedOrders = Order::query()
            ->where('status', OrderStatus::Paid)
            ->with('user:id,name,email')
            ->withSum('items as items_quantity_total', 'quantity')
            ->orderBy('paid_at')
            ->orderBy('id')
            ->limit(self::UNSHIPPED_LIST_LIMIT)
            ->get();

        return response()->json([
            'data' => [
                'unshipped_count' => Order::where('status', OrderStatus::Paid)->count(),
                'awaiting_delivery_count' => Order::where('status', OrderStatus::Shipped)->count(),
                'low_stock_count' => $stockTotals->filter(fn (int $s) => $s > 0 && $s <= $threshold)->count(),
                'sold_out_count' => $stockTotals->filter(fn (int $s) => $s === 0)->count(),
                'unshipped_orders' => OrderListResource::collection($unshippedOrders),
            ],
        ]);
    }
}
