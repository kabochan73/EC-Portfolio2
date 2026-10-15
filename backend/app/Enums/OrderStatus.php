<?php

namespace App\Enums;

/**
 * 注文ステータスの state machine（docs/02-database-design.md）。
 *
 * この Enum は「遷移が許されるか」の判定だけを持つ。遷移の副作用
 * （在庫戻し・返金・メール）は App\Actions\Admin\Order\TransitionOrderStatus。
 */
enum OrderStatus: string
{
    case Pending = 'pending';
    case Paid = 'paid';
    case Shipped = 'shipped';
    case Completed = 'completed';
    case Cancelled = 'cancelled';

    /**
     * この状態から遷移可能な次状態の一覧。
     *
     * @return list<self>
     */
    public function transitions(): array
    {
        return match ($this) {
            self::Pending => [self::Paid, self::Cancelled],
            self::Paid => [self::Shipped, self::Cancelled],
            self::Shipped => [self::Completed, self::Cancelled],
            self::Completed, self::Cancelled => [],
        };
    }

    public function canTransitionTo(self $to): bool
    {
        return in_array($to, $this->transitions(), true);
    }

    /** これ以上変化しない終端状態か */
    public function isTerminal(): bool
    {
        return $this->transitions() === [];
    }
}
