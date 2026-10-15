<?php

namespace App\Jobs;

use App\Mail\OrderConfirmationMail;
use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;

/**
 * 注文確認メールの送信（決済完了時。docs/10-email.md）。
 * ペイロードは order_id のみ。
 */
class SendOrderConfirmationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function __construct(public int $orderId) {}

    public function handle(): void
    {
        $order = Order::with(['items', 'user'])->find($this->orderId);

        if ($order === null || $order->user === null) {
            return;
        }

        $url = rtrim(config('app.frontend_url'), '/').'/account/orders/'.$order->order_number;

        Mail::to($order->user->email)->send(new OrderConfirmationMail($order, $url));
    }
}
