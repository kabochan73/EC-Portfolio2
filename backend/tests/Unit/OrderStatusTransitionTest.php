<?php

use App\Enums\OrderStatus;

// 注文ステータスの state machine（docs/02-database-design.md）。
// 許可する遷移だけを列挙し、5×5 = 25 通りの組み合わせ全部を検証する。
// （R3 は「禁止する遷移」も手で列挙していたため、漏れがあっても気づけなかった。
//   R4 は許可リスト以外を自動で全部「禁止」として確かめる）

const ALLOWED_TRANSITIONS = [
    ['pending', 'paid'],
    ['pending', 'cancelled'],
    ['paid', 'shipped'],
    ['paid', 'cancelled'],
    ['shipped', 'completed'],
    ['shipped', 'cancelled'],
];

dataset('every pair of statuses', function () {
    foreach (OrderStatus::cases() as $from) {
        foreach (OrderStatus::cases() as $to) {
            yield "{$from->value} → {$to->value}" => [$from, $to];
        }
    }
});

it('allows only the documented transitions', function (OrderStatus $from, OrderStatus $to) {
    $allowed = in_array([$from->value, $to->value], ALLOWED_TRANSITIONS, true);

    expect($from->canTransitionTo($to))->toBe($allowed);
})->with('every pair of statuses');

it('treats completed and cancelled as terminal', function () {
    expect(OrderStatus::Completed->isTerminal())->toBeTrue()
        ->and(OrderStatus::Cancelled->isTerminal())->toBeTrue()
        ->and(OrderStatus::Pending->isTerminal())->toBeFalse()
        ->and(OrderStatus::Paid->isTerminal())->toBeFalse()
        ->and(OrderStatus::Shipped->isTerminal())->toBeFalse();
});
