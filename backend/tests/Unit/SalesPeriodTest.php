<?php

use App\Domain\Sales\SalesPeriod;
use Carbon\CarbonImmutable;

// 売上ダッシュボードの期間計算（docs/05-admin.md）。区切りは日本時間。
// 「UTC ではまだ前の日 / 前の月」になる時間帯（JST 0:00〜8:59）を重点的に確かめる

function periodAtJst(string $datetime): SalesPeriod
{
    return new SalesPeriod(CarbonImmutable::parse($datetime, 'Asia/Tokyo'));
}

/** @param array{0: CarbonImmutable, 1: CarbonImmutable} $range */
function fmt(array $range): string
{
    return $range[0]->format('Y-m-d H:i').' → '.$range[1]->format('Y-m-d H:i');
}

it('treats JST 00:30 on the 1st as the new month even though UTC is still the previous month', function () {
    $period = periodAtJst('2026-11-01 00:30');

    expect($period->now->utc()->format('Y-m-d'))->toBe('2026-10-31')
        ->and(fmt($period->thisMonth()))->toBe('2026-11-01 00:00 → 2026-12-01 00:00')
        ->and(fmt($period->today()))->toBe('2026-11-01 00:00 → 2026-11-02 00:00')
        ->and(fmt($period->lastMonth()))->toBe('2026-10-01 00:00 → 2026-11-01 00:00');
});

it('converts the JST month boundaries to UTC for the query', function () {
    [$start, $end] = periodAtJst('2026-10-16 12:00')->thisMonth();

    // JST 10/01 00:00 = UTC 09/30 15:00
    expect($start->utc()->format('Y-m-d H:i'))->toBe('2026-09-30 15:00')
        ->and($end->utc()->format('Y-m-d H:i'))->toBe('2026-10-31 15:00');
});

it('lists every day of the current month, including future days', function () {
    $days = periodAtJst('2026-02-10 09:00')->daysOfThisMonth();

    expect($days)->toHaveCount(28)
        ->and($days[0])->toBe('2026-02-01')
        ->and($days[27])->toBe('2026-02-28');
});

it('handles the last month from a 31st without overflowing', function () {
    // 3/31 から「1 か月前」を素朴に計算すると 2/31 → 3/03 にずれる。NoOverflow で 2 月になる
    expect(fmt(periodAtJst('2026-03-31 20:00')->lastMonth()))
        ->toBe('2026-02-01 00:00 → 2026-03-01 00:00');
});

it('lists the last twelve months oldest first, across the year boundary', function () {
    $period = periodAtJst('2026-01-15 10:00');

    expect($period->monthsOfLastTwelve())->toBe([
        '2025-02', '2025-03', '2025-04', '2025-05', '2025-06', '2025-07',
        '2025-08', '2025-09', '2025-10', '2025-11', '2025-12', '2026-01',
    ])->and(fmt($period->lastTwelveMonths()))->toBe('2025-02-01 00:00 → 2026-02-01 00:00');
});

it('returns any chosen month and the month before it, for the ranking (R4)', function () {
    $period = periodAtJst('2026-10-17 12:00');

    expect(fmt($period->month('2026-09')))->toBe('2026-09-01 00:00 → 2026-10-01 00:00')
        ->and(fmt($period->monthBefore('2026-09')))->toBe('2026-08-01 00:00 → 2026-09-01 00:00')
        // 年をまたぐ / 3 月の前は 2 月（日数の違う月でもずれない）
        ->and(fmt($period->monthBefore('2026-01')))->toBe('2025-12-01 00:00 → 2026-01-01 00:00')
        ->and(fmt($period->monthBefore('2026-03')))->toBe('2026-02-01 00:00 → 2026-03-01 00:00')
        ->and($period->month('2026-09')[0]->utc()->format('Y-m-d H:i'))->toBe('2026-08-31 15:00')
        ->and($period->currentMonth())->toBe('2026-10');
});
