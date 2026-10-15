<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Stripe PaymentIntent を注文と 1:1 で記録する（docs/09-payments-stripe.md）
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('provider', 20)->default('stripe');
            $table->string('stripe_payment_intent_id', 255)->unique();
            $table->string('status', 30); // Stripe の値をそのまま（succeeded / processing など）
            $table->integer('amount');    // PaymentIntent 作成時の金額（= orders.total、円）
            $table->string('currency', 3)->default('jpy');
            $table->string('stripe_charge_id', 255)->nullable(); // 成功後。返金用
            $table->timestamp('refunded_at')->nullable();
            $table->string('last_error', 255)->nullable(); // 直近の決済失敗理由（表示用）
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
