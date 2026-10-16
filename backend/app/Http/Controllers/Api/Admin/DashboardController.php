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
    /**
     * GET /api/admin/stats … ダッシュボードの数字（docs/05-admin.md）。
     * revenue_total は R2 では出さなかったが、決済がある R3 で復活。
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

        $recentOrders = Order::query()
            ->with('user:id,name,email')
            ->withSum('items as items_quantity_total', 'quantity')
            ->recentFirst()
            ->limit(5)
            ->get();

        return response()->json([
            'data' => [
                'orders_count' => Order::count(),
                'revenue_total' => (int) Order::query()
                    ->whereIn('status', [OrderStatus::Paid, OrderStatus::Shipped, OrderStatus::Completed])
                    ->sum('total'),
                'pending_count' => Order::where('status', OrderStatus::Pending)->count(),
                'sold_out_count' => $stockTotals->filter(fn (int $s) => $s === 0)->count(),
                'low_stock_count' => $stockTotals->filter(fn (int $s) => $s > 0 && $s <= $threshold)->count(),
                'recent_orders' => OrderListResource::collection($recentOrders),
            ],
        ]);
    }
}
