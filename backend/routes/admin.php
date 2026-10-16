<?php

use App\Http\Controllers\Api\Admin\CategoryController;
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
