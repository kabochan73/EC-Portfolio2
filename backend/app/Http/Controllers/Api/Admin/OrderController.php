<?php

namespace App\Http\Controllers\Api\Admin;

use App\Actions\Admin\Order\TransitionOrderStatus;
use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Order\UpdateOrderStatusRequest;
use App\Http\Resources\Admin\OrderListResource;
use App\Http\Resources\Admin\OrderResource;
use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

/**
 * 管理向けの注文（全ユーザー横断）。{order} は注文番号で引かれる（Order::getRouteKeyName）。
 * 見つからなければルートモデルバインディングが 404 を返すので、ここでは探さない（R4。R3 は手で探していた）
 */
class OrderController extends Controller
{
    /** 詳細表示・ステータス変更後のレスポンスで読み込むリレーション */
    private const DETAIL_RELATIONS = ['user:id,name,email', 'items.product:id,slug', 'payment'];

    /** GET /api/admin/orders … 全ユーザーの注文。?status= &customer_id= &page= */
    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'status' => ['sometimes', Rule::enum(OrderStatus::class)],
            'customer_id' => ['sometimes', 'integer', 'exists:users,id'],
            'page' => ['sometimes', 'integer', 'min:1'],
        ]);

        $orders = Order::query()
            ->with('user:id,name,email')
            ->withSum('items as items_quantity_total', 'quantity')
            ->when(isset($filters['status']), fn ($q) => $q->where('status', $filters['status']))
            ->when(isset($filters['customer_id']), fn ($q) => $q->where('user_id', $filters['customer_id']))
            ->recentFirst()
            ->paginate(20);

        return OrderListResource::collection($orders);
    }

    /** GET /api/admin/orders/{order} … 明細・配送先・顧客・決済情報。 */
    public function show(Order $order): OrderResource
    {
        return OrderResource::make($order->load(self::DETAIL_RELATIONS));
    }

    /** PUT /api/admin/orders/{order}/status … state machine（docs/02）。不正遷移は 422。 */
    public function updateStatus(UpdateOrderStatusRequest $request, Order $order, TransitionOrderStatus $transitionOrderStatus): OrderResource
    {
        $updated = $transitionOrderStatus->execute($order, OrderStatus::from($request->string('status')->toString()));

        return OrderResource::make($updated->load(self::DETAIL_RELATIONS));
    }
}
