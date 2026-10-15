<?php

namespace App\Exceptions;

use App\Enums\OrderStatus;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * 決済しようとした注文が pending でない（docs/09-payments-stripe.md）。
 */
final class OrderNotPendingException extends Exception
{
    public function __construct(public readonly OrderStatus $currentStatus)
    {
        parent::__construct('Order is not awaiting payment.');
    }

    public function render(Request $request): JsonResponse
    {
        return response()->json([
            'message' => 'この注文はすでに処理されています。',
            'status' => $this->currentStatus->value,
        ], 409);
    }
}
