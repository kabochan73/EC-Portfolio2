<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->constrained()->restrictOnDelete();
            $table->string('name', 120);
            $table->string('slug', 140)->unique();
            $table->integer('price'); // JPY 税込。CHECK は下で付与
            $table->text('description');
            $table->text('material');
            $table->text('care')->nullable();
            $table->string('origin', 50);
            $table->string('product_code', 30);
            $table->jsonb('size_chart')->nullable();
            $table->boolean('is_published')->default(true);
            $table->integer('position')->default(0);
            $table->timestamps();

            $table->index(['is_published', 'position']);
        });

        DB::statement('ALTER TABLE products ADD CONSTRAINT products_price_positive CHECK (price > 0)');
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
