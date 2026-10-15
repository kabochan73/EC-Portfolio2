<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('addresses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('recipient_name', 100);
            $table->string('postal_code', 8);   // 123-4567
            $table->string('prefecture', 10);
            $table->string('city', 100);
            $table->string('address_line1', 255);
            $table->string('address_line2', 255)->nullable();
            $table->string('phone', 20);
            // ユーザーごと最大1件 true（Action が担保 + 下の部分 UNIQUE インデックスで DB も保証）
            $table->boolean('is_default')->default(false);
            $table->timestamps();

            $table->index('user_id');
        });

        // 「いつも使う住所」はユーザーごとに最大 1 件（R4 追加）。is_default = true の行だけに
        // 効く部分 UNIQUE インデックスなので、false の行は何件あってもよい。
        // Action 側は「先に他を false → 対象を true」の順に更新すること（逆だと一瞬 2 件になり違反）
        DB::statement('CREATE UNIQUE INDEX addresses_one_default_per_user ON addresses (user_id) WHERE is_default');
    }

    public function down(): void
    {
        Schema::dropIfExists('addresses');
    }
};
