<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            // 商品情報はスナップショットで持つ。参照リンク用途で nullable FK
            $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('product_variant_id')->nullable()->constrained()->nullOnDelete();
            $table->string('product_name', 120);
            $table->string('variant_size', 10);
            $table->string('variant_color', 30)->nullable();
            $table->string('image_url', 255)->default(''); // 画像なしは空文字
            $table->integer('unit_price');
            $table->integer('quantity');
            $table->integer('line_total');
            $table->timestamps();

            // PostgreSQL は外部キーに自動でインデックスを張らない（MySQL とは違う）。
            // 「注文の明細を取る」「売上ランキングで orders と結合する」ときに使う（R4 追加）
            $table->index('order_id');
        });

        DB::statement('ALTER TABLE order_items ADD CONSTRAINT order_items_quantity_positive CHECK (quantity > 0)');
    }

    public function down(): void
    {
        Schema::dropIfExists('order_items');
    }
};
