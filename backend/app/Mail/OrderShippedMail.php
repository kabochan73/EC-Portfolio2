<?php

namespace App\Mail;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * 発送通知（admin が paid → shipped にしたとき。docs/10-email.md）。
 * 追跡番号は持たない（スコープ外）。
 */
class OrderShippedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Order $order,
        public string $orderUrl,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "[EC-PORTFOLIO] 商品を発送しました ({$this->order->order_number})",
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'mail.order-shipped',
        );
    }
}
