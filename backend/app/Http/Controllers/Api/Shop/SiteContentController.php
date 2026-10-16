<?php

namespace App\Http\Controllers\Api\Shop;

use App\Http\Controllers\Controller;
use App\Models\SiteContent;
use Illuminate\Http\JsonResponse;

class SiteContentController extends Controller
{
    /**
     * GET /api/content … トップページの CMS コンテンツ（docs/11-cms.md）。
     * 4 キーを必ず全部返す。DB に行が無いキーはデフォルトで埋める。
     * 画像 URL は data 内に /media/... の形で保持されている。
     */
    public function index(): JsonResponse
    {
        return response()->json(['data' => SiteContent::allWithDefaults()]);
    }
}
