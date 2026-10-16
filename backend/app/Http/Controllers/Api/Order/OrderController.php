<?php

namespace App\Http\Controllers\Api\Order;

use App\Actions\Order\CancelSupersededOrders;
use App\Actions\Order\CreateOrder;
use App\Actions\Order\CreateOrderInput;
use App\Http\Controllers\Controller;
use App\Http\Requests\Order\StoreOrderRequest;
use App\Http\Resources\Order\OrderListResource;
use App\Http\Resources\Order\OrderResource;
use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class OrderController extends Controller
{
    /** GET /api/orders … 本人の注文一覧（新しい順・要約）。 */
    public function index(Request $request): AnonymousResourceCollection
    {
        $orders = Order::query()
            ->forUser($request->user())
            // 点数 = 明細の quantity 合計。注文ごとに明細を読まず、1 クエリで集計する
            ->withSum('items as items_quantity_total', 'quantity')
            ->recentFirst()
            ->get();

        return OrderListResource::collection($orders);
    }

    /**
     * POST /api/orders … 注文を pending で作成し在庫を引き当てる（docs/03-api.md）。
     * 同じユーザーの未決済注文は、新しい注文で置き換える（キャンセルして在庫を戻す）。
     */
    public function store(
        StoreOrderRequest $request,
        CancelSupersededOrders $cancelSupersededOrders,
        CreateOrder $createOrder,
    ): JsonResponse {
        $cancelSupersededOrders->execute($request->user());

        $order = $createOrder->execute(
            user: $request->user(),
            input: CreateOrderInput::fromRequest($request),
        );

        return OrderResource::make($order)->response()->setStatusCode(201);
    }

    /**
     * GET /api/orders/{order_number} … 本人の注文詳細。他人の番号は 404（存在を秘匿）。
     * {order} は Order::getRouteKeyName() により order_number で引かれる（ルートモデルバインディング）
     */
    public function show(Request $request, Order $order): OrderResource
    {
        abort_unless($order->user_id === $request->user()->id, 404);

        return OrderResource::make($order->load(['items.product:id,slug', 'payment']));
    }
}
