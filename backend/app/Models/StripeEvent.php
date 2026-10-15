<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Webhook の冪等性を DB で保証する処理済みイベント台帳（docs/09-payments-stripe.md）。
 *
 * claim() … 未処理として記録。既に処理済み（processed_at あり）なら false。
 *           processed_at が null の行（前回失敗）は再処理を許すため true を返す。
 * complete() … 処理完了をマーク。
 */
class StripeEvent extends Model
{
    public $timestamps = false;

    /** @var list<string> */
    protected $fillable = ['stripe_event_id', 'type', 'processed_at', 'created_at'];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'processed_at' => 'datetime',
            'created_at' => 'datetime',
        ];
    }

    public static function claim(string $eventId, string $type): bool
    {
        $row = static::firstOrCreate(
            ['stripe_event_id' => $eventId],
            ['type' => $type, 'created_at' => now()],
        );

        return $row->processed_at === null;
    }

    public static function complete(string $eventId): void
    {
        static::where('stripe_event_id', $eventId)->update(['processed_at' => now()]);
    }
}
