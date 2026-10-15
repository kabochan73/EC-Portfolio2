<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_variants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->string('size', 10);          // S / M / L / FREE
            $table->string('color', 30)->nullable();
            $table->string('sku', 40)->unique();
            $table->integer('stock');            // CHECK は下で付与
            $table->integer('position')->default(0);
            $table->timestamps();
        });

        DB::statement('ALTER TABLE product_variants ADD CONSTRAINT product_variants_stock_non_negative CHECK (stock >= 0)');

        // NULL 複合 UNIQUE の罠（R2 の反省）を避けるため 2 本立て:
        //  1) color が入っている行 … 通常の複合 UNIQUE
        //  2) color が null の行   … 部分 UNIQUE インデックス
        DB::statement('CREATE UNIQUE INDEX product_variants_pid_size_color_unique ON product_variants (product_id, size, color) WHERE color IS NOT NULL');
        DB::statement('CREATE UNIQUE INDEX product_variants_pid_size_nullcolor_unique ON product_variants (product_id, size) WHERE color IS NULL');
    }

    public function down(): void
    {
        Schema::dropIfExists('product_variants');
    }
};
