<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Webhook の冪等性を DB で保証するための処理済みイベント台帳（docs/09 §「Webhook: 冪等性の実装」）
        Schema::create('stripe_events', function (Blueprint $table) {
            $table->id();
            $table->string('stripe_event_id', 255)->unique(); // evt_...
            $table->string('type', 80);                       // payment_intent.succeeded など
            $table->timestamp('processed_at')->nullable();    // 処理完了時刻（null = 未処理・再処理可）
            $table->timestamp('created_at')->nullable();       // 受信時刻
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stripe_events');
    }
};
