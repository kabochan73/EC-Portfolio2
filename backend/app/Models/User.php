<?php

namespace App\Models;

use App\Enums\UserRole;
use App\Jobs\SendPasswordResetJob;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

/**
 * メール認証は実装しない（ポートフォリオ用途。R3 で 2026-09-14 に撤去した判断を踏襲）。
 */
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /** @var list<string> */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
    ];

    /** @var list<string> */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'role' => UserRole::class,
        ];
    }

    public function isAdmin(): bool
    {
        return $this->role === UserRole::Admin;
    }

    /**
     * パスワード再設定通知も自前 Mailable（docs/10-email.md）。Password broker から呼ばれる。
     * 標準の Notification を使わず Job を積むのは、4 通のメールの見た目を Mailable で揃えるため
     */
    public function sendPasswordResetNotification($token): void
    {
        SendPasswordResetJob::dispatch($this->id, $token);
    }

    /** @return HasMany<Address, $this> */
    public function addresses(): HasMany
    {
        return $this->hasMany(Address::class);
    }

    /** @return HasMany<Order, $this> */
    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }
}
