<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // トップページの編集可能コンテンツ（軽量 CMS。docs/11-cms.md）
        Schema::create('site_contents', function (Blueprint $table) {
            $table->id();
            $table->string('key', 40)->unique();          // hero / concept / lookbook / about
            $table->jsonb('data');                         // セクションごとのスキーマ（docs/11）
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('site_contents');
    }
};
