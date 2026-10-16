<?php

namespace App\Actions\Order;

use App\Actions\Admin\Order\TransitionOrderStatus;
use App\Enums\OrderStatus;
use App\Exceptions\PaymentInProgressException;
use App\Models\Order;
use App\Models\User;
use Stripe\Exception\ApiErrorException;

/**
 * 新しい注文を作る前に、同じユーザーの未決済（pending）注文をキャンセルして在庫を戻す
 * （docs/09-payments-stripe.md）。決済画面から戻って注文し直したときの在庫の二重確保を防ぎ、
 * 1ユーザーが確保できる在庫を「最新の注文1件分」に抑える。
 *
 * 決済処理中の注文や Stripe に繋がらなかった注文は残す（Webhook / orders:expire-pending に任せる）。
 */
final class CancelSupersededOrders
{
    public function __construct(private readonly TransitionOrderStatus $transition) {}

    public function execute(User $user): void
    {
        $orders = Order::query()
            ->forUser($user)
            ->where('status', OrderStatus::Pending)
            ->get();

        foreach ($orders as $order) {
            try {
                $this->transition->cancelIfPending($order);
            } catch (PaymentInProgressException) {
                // 支払い確定待ち。Webhook で paid になる
            } catch (ApiErrorException $e) {
                report($e);
            }
        }
    }
}
