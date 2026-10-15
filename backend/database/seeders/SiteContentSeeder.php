<?php

namespace Database\Seeders;

use App\Models\SiteContent;
use Illuminate\Database\Seeder;

class SiteContentSeeder extends Seeder
{
    /**
     * トップページ CMS の初期値（docs/11-cms.md）。デフォルト値をそのまま投入する。
     * 冪等（key で updateOrCreate、既存の編集は上書きしない）。
     */
    public function run(): void
    {
        foreach (SiteContent::KEYS as $key) {
            SiteContent::firstOrCreate(
                ['key' => $key],
                ['data' => SiteContent::defaults($key)],
            );
        }
    }
}
