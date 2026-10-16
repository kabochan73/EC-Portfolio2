<?php

use App\Http\Controllers\Api\Admin\CategoryController;
use App\Http\Controllers\Api\Admin\OrderController;
use App\Http\Controllers\Api\Admin\ProductController;
use App\Http\Controllers\Api\Admin\ProductImageController;
use App\Http\Controllers\Api\Admin\VariantController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| 管理 API（/api/admin/*）… admin ロールのみ。docs/05-admin.md
|--------------------------------------------------------------------------
| routes/api.php から prefix('admin') + middleware(['auth:sanctum', 'admin'])
| のグループとして読み込まれる。ここには「グループ内の定義」だけを書く
| （認可を 1 か所で付けるので、ルートごとの付け忘れが起きない）。
*/

// --- カテゴリ ---
// reorder は静的パスなので apiResource の {category} より先に登録する（後だと "reorder" が id として解釈される）
Route::put('/categories/reorder', [CategoryController::class, 'reorder']);
Route::apiResource('categories', CategoryController::class)->except(['show']);

// --- 商品（基本情報。未公開も含む） ---
Route::apiResource('products', ProductController::class);

// --- 商品画像（URL の形が apiResource の規約と合わないので手書き。reorder は静的パス） ---
Route::post('/products/{product}/images', [ProductImageController::class, 'store']);
Route::put('/products/{product}/images/reorder', [ProductImageController::class, 'reorder']);
Route::delete('/product-images/{productImage}', [ProductImageController::class, 'destroy']);

// --- バリアント（サイズ × 色）---
// shallow: 作成は「どの商品か」が要るので /products/{product}/variants、
// 作成後は id だけで特定できるので /variants/{variant}（R3 の手書き 3 本と同じ URL を 1 行で）
Route::apiResource('products.variants', VariantController::class)
    ->shallow()
    ->only(['store', 'update', 'destroy']);

// --- 注文（全ユーザー横断。{order} は注文番号）---
Route::apiResource('orders', OrderController::class)->only(['index', 'show']);
Route::put('/orders/{order}/status', [OrderController::class, 'updateStatus']);
