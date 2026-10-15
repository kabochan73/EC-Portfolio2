<?php

namespace App\Jobs;

use App\Mail\ResetPasswordMail;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;

/**
 * パスワード再設定メールの送信（docs/10-email.md）。
 * Password broker の標準通知を自前 Mailable に差し替える経路。
 */
class SendPasswordResetJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function __construct(
        public int $userId,
        public string $token,
    ) {}

    public function handle(): void
    {
        $user = User::find($this->userId);

        if ($user === null) {
            return;
        }

        $expires = (int) config('auth.passwords.'.config('auth.defaults.passwords').'.expire', 60);

        $url = rtrim(config('app.frontend_url'), '/')
            .'/reset-password?token='.$this->token
            .'&email='.urlencode($user->getEmailForPasswordReset());

        Mail::to($user->email)->send(new ResetPasswordMail($user->name, $url, $expires));
    }
}
