<?php

namespace App\Console\Commands;

use App\Actions\Admin\Order\TransitionOrderStatus;
use App\Enums\OrderStatus;
use App\Exceptions\PaymentInProgressException;
use App\Models\Order;
use Illuminate\Console\Command;
use Throwable;

/**
 * 有効期限（config('shop.pending_order_ttl_minutes')）を過ぎた未決済注文をキャンセルし、
 * 在庫を戻す（docs/09-payments-stripe.md）。routes/console.php のスケジュールから5分ごとに実行。
 * Stripe の PaymentIntent は自動では期限切れにならないので、こちらから取り消す。
 */
class ExpirePendingOrders extends Command
{
    protected $signature = 'orders:expire-pending';

    protected $description = '期限切れの未決済注文をキャンセルして在庫を戻す';

    public function handle(TransitionOrderStatus $transition): int
    {
        $cutoff = now()->subMinutes((int) config('shop.pending_order_ttl_minutes'));

        $orders = Order::query()
            ->where('status', OrderStatus::Pending)
            ->where('created_at', '<', $cutoff)
            ->get();

        $expired = 0;
        foreach ($orders as $order) {
            try {
                if ($transition->cancelIfPending($order)) {
                    $expired++;
                }
            } catch (PaymentInProgressException) {
                // 支払い確定待ち。Webhook で paid になる
            } catch (Throwable $e) {
                // 1件の失敗で残りを止めない。次回の実行で再試行される
                report($e);
            }
        }

        $this->info("Expired {$expired} pending order(s).");

        return self::SUCCESS;
    }
}
