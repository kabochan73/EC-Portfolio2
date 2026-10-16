<?php

namespace App\Exceptions;

use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * 決済が確定済み / 処理中のため、pending 注文をキャンセルできない（docs/09-payments-stripe.md）。
 * Webhook（payment_intent.succeeded）で paid になるのを待つ。
 */
final class PaymentInProgressException extends Exception
{
    public function __construct()
    {
        parent::__construct('Payment is already succeeded or processing.');
    }

    public function render(Request $request): JsonResponse
    {
        return response()->json([
            'message' => '決済処理中のためキャンセルできません。しばらくしてから再度確認してください。',
        ], 409);
    }
}
