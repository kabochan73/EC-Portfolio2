<?php

namespace App\Exceptions;

use App\Enums\OrderStatus;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * 許可されていない注文ステータス遷移（docs/02-database-design.md の state machine）。
 */
final class InvalidOrderTransitionException extends Exception
{
    public function __construct(
        public readonly OrderStatus $from,
        public readonly OrderStatus $to,
    ) {
        parent::__construct("Cannot transition order from {$from->value} to {$to->value}.");
    }

    public function render(Request $request): JsonResponse
    {
        return response()->json([
            'message' => "「{$this->from->value}」から「{$this->to->value}」へは変更できません。",
            'errors' => ['status' => ['この操作は許可されていません。']],
        ], 422);
    }
}
