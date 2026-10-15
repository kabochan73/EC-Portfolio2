<?php

namespace App\Http\Controllers\Api\Shop;

use App\Http\Controllers\Controller;
use App\Http\Resources\Shop\ProductSummaryResource;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ProductController extends Controller
{
    /**
     * 公開商品一覧（カード表示用）。docs/03-api.md
     *
     * クエリ:
     *  - category … カテゴリ slug で絞り込み
     *  - new      … "true" で作成30日以内・新着順（トップの新着セクション用）
     *  - limit    … 件数上限（1〜100）
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'category' => ['sometimes', 'string', 'exists:categories,slug'],
            'limit' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        // ?new=true / 1 / yes などを許容（Request::boolean が正規化してくれる）。
        // validate の 'boolean' ルールは文字列 "true" を弾くので使わない（R3 で 422 になった）
        $onlyNew = $request->boolean('new');

        $query = Product::query()
            ->published()
            ->with(['category', 'images', 'variants'])
            ->when(
                isset($validated['category']),
                fn ($q) => $q->inCategory($validated['category']),
            );

        if ($onlyNew) {
            $query->new()->orderByDesc('created_at')->orderByDesc('id');
        } else {
            $query->ordered();
        }

        if (isset($validated['limit'])) {
            $query->limit($validated['limit']);
        }

        return ProductSummaryResource::collection($query->get());
    }
}
