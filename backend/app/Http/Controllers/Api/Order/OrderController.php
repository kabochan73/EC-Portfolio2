<?php

namespace App\Http\Controllers\Api\Order;

use App\Actions\Order\CreateOrder;
use App\Actions\Order\CreateOrderInput;
use App\Http\Controllers\Controller;
use App\Http\Requests\Order\StoreOrderRequest;
use App\Http\Resources\Order\OrderResource;
use Illuminate\Http\JsonResponse;

class OrderController extends Controller
{
    /**
     * POST /api/orders … 注文を pending で作成し在庫を引き当てる（docs/03-api.md）。
     * 同じユーザーの未決済注文の置き換え（キャンセルして在庫を戻す）は Step 22 で足す。
     */
    public function store(StoreOrderRequest $request, CreateOrder $createOrder): JsonResponse
    {
        $order = $createOrder->execute(
            user: $request->user(),
            input: CreateOrderInput::fromRequest($request),
        );

        return OrderResource::make($order)->response()->setStatusCode(201);
    }
}
