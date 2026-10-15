<?php

namespace App\Exceptions;

use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * 注文作成時の合計と、いま再計算した合計がズレている（カタログ価格が変わった等）。
 * 注文を作り直させる（docs/09-payments-stripe.md）。
 */
final class PaymentAmountMismatchException extends Exception
{
    public function __construct(
        public readonly int $orderTotal,
        public readonly int $recalculatedTotal,
    ) {
        parent::__construct('Order total no longer matches the current prices.');
    }

    public function render(Request $request): JsonResponse
    {
        return response()->json([
            'message' => '商品の価格が変更されました。お手数ですが注文をやり直してください。',
        ], 409);
    }
}
