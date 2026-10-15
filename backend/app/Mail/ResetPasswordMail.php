<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * パスワード再設定（docs/10-email.md）。装飾のモノトーン化は注文メールの Step でまとめて行う。
 */
class ResetPasswordMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $recipientName,
        public string $resetUrl,
        public int $expiresMinutes,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '[EC-PORTFOLIO] パスワード再設定のご案内',
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'mail.reset-password',
        );
    }
}
