<?php

use Illuminate\Support\Facades\Schedule;

// スケジューラ（ローカル: compose の scheduler / 本番: Railway の scheduler サービスが schedule:work で常駐）

// 期限切れの未決済注文をキャンセルして在庫を戻す（docs/09-payments-stripe.md）
Schedule::command('orders:expire-pending')->everyFiveMinutes()->withoutOverlapping();

// 期限切れの Sanctum トークンを削除（config/sanctum.php の expiration）
Schedule::command('sanctum:prune-expired --hours=24')->daily();
