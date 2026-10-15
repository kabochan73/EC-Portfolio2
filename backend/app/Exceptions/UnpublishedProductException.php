<?php

namespace App\Exceptions;

use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * 非公開商品が注文に含まれていた（docs/03-api.md POST /api/orders）。
 */
final class UnpublishedProductException extends Exception
{
    /**
     * @param  list<int>  $productIds
     */
    public function __construct(public readonly array $productIds)
    {
        parent::__construct('One or more items are no longer available.');
    }

    public function render(Request $request): JsonResponse
    {
        return response()->json([
            'message' => '現在購入できない商品が含まれています。',
            'errors' => ['items' => ['一部の商品が販売終了しています。']],
            'unavailable_product_ids' => $this->productIds,
        ], 422);
    }
}
