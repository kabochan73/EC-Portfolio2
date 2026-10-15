<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->string('order_number', 20)->unique();  // EC-YYYYMMDD-NNNN
            $table->string('status', 20)->default('pending');
            $table->integer('subtotal');
            $table->integer('shipping_fee');
            $table->integer('total');
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('shipped_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            // 配送先スナップショット（住所録を後で編集・削除しても注文履歴は不変）
            $table->string('ship_recipient_name', 100);
            $table->string('ship_postal_code', 8);
            $table->string('ship_prefecture', 10);
            $table->string('ship_city', 100);
            $table->string('ship_address_line1', 255);
            $table->string('ship_address_line2', 255)->nullable();
            $table->string('ship_phone', 20);
            $table->timestamps();

            $table->index('user_id');
            // 売上ダッシュボードの「売上対象ステータス × 期間」集計用（R4 追加。docs/05-admin.md）。
            // 先頭列が status なので、R3 にあった status 単独のインデックスの役目も兼ねる
            $table->index(['status', 'paid_at']);
        });

        DB::statement("ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN ('pending','paid','shipped','completed','cancelled'))");
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
