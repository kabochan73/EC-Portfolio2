<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
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
            // ユーザーごと最大1件 true（アプリ側で担保。docs/02-database-design.md）
            $table->boolean('is_default')->default(false);
            $table->timestamps();

            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('addresses');
    }
};
