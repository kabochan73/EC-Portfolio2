<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * - AdminUserSeeder   … 管理者アカウント1人
     * - CategorySeeder    … カテゴリ4件（Tops / Bottoms / Outerwear / Accessories）
     * - SiteContentSeeder … トップページ CMS の初期値（hero / concept / lookbook / about）
     * - ProductSeeder     … 開発・レビュー用カタログ（画像なし。CategorySeeder が先に必要）
     *
     * すべて冪等（updateOrCreate / firstOrCreate）。ダミー顧客は手動投入する。
     */
    public function run(): void
    {
        $this->call([
            AdminUserSeeder::class,
            CategorySeeder::class,
            SiteContentSeeder::class,
            ProductSeeder::class,
        ]);
    }
}
