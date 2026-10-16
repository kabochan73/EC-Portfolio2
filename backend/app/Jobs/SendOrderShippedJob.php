<?php

namespace App\Jobs;

use App\Mail\OrderShippedMail;
use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;

/**
 * 発送通知メールの送信（docs/10-email.md）。
 */
class SendOrderShippedJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function __construct(public int $orderId) {}

    public function handle(): void
    {
        $order = Order::with('user')->find($this->orderId);

        if ($order === null || $order->user === null) {
            return;
        }

        $url = rtrim(config('app.frontend_url'), '/').'/account/orders/'.$order->order_number;

        Mail::to($order->user->email)->send(new OrderShippedMail($order, $url));
    }
}
