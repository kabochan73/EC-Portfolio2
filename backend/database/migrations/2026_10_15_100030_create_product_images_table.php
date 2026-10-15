<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_images', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            // バケットのオブジェクトキー（例 products/12/01J....jpg）。url は API リソースが組み立てる
            $table->string('path', 255);
            $table->string('alt', 255)->default('');
            // 0=主画像 / 1=一覧ホバー画像 / 以降ギャラリー順
            $table->integer('position')->default(0);
            $table->timestamps();

            $table->index(['product_id', 'position']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_images');
    }
};
