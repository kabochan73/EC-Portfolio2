<?php

namespace App\Exceptions;

use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * 所属商品があるカテゴリを削除しようとした（docs/05-admin.md）。
 * DB の RESTRICT に頼らず事前チェックして 409 を返す。
 */
final class CategoryInUseException extends Exception
{
    public function __construct(public readonly int $productCount)
    {
        parent::__construct('Category still has products.');
    }

    public function render(Request $request): JsonResponse
    {
        return response()->json([
            'message' => "このカテゴリには商品が {$this->productCount} 件あります。先に移動または削除してください。",
        ], 409);
    }
}
