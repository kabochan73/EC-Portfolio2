<?php

namespace App\Domain\Sales;

use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;

/**
 * 売上ダッシュボードの「期間」の計算（docs/05-admin.md 売上ダッシュボード）。DB を使わない純粋ロジック。
 *
 * - 区切りはすべて日本時間。DB の paid_at は UTC なので、クエリに渡すときは呼び出し側で ->utc() する
 *   （Laravel は Carbon をバインドするとき時差を変換せず、その時計の表示のまま文字列にするため）
 * - 範囲は [start, end)（end は含まない）。「10 月」は 10/01 00:00 以上 11/01 00:00 未満
 */
final class SalesPeriod
{
    public const TIMEZONE = 'Asia/Tokyo';

    /** 過去 12 か月グラフの月数（今月を含む） */
    public const MONTHS = 12;

    public readonly CarbonImmutable $now;

    public function __construct(?CarbonInterface $now = null)
    {
        $this->now = CarbonImmutable::instance($now ?? now())->setTimezone(self::TIMEZONE);
    }

    /** @return array{0: CarbonImmutable, 1: CarbonImmutable} 今日 [00:00, 翌日 00:00) */
    public function today(): array
    {
        $start = $this->now->startOfDay();

        return [$start, $start->addDay()];
    }

    /** @return array{0: CarbonImmutable, 1: CarbonImmutable} 今月 [1 日 00:00, 翌月 1 日 00:00) */
    public function thisMonth(): array
    {
        $start = $this->now->startOfMonth();

        return [$start, $start->addMonthNoOverflow()];
    }

    /** @return array{0: CarbonImmutable, 1: CarbonImmutable} 先月 1 か月分すべて（前月比の基準） */
    public function lastMonth(): array
    {
        $start = $this->now->startOfMonth()->subMonthNoOverflow();

        return [$start, $start->addMonthNoOverflow()];
    }

    /** @return array{0: CarbonImmutable, 1: CarbonImmutable} 過去 12 か月（今月を含む）の 1 日から翌月 1 日まで */
    public function lastTwelveMonths(): array
    {
        $end = $this->now->startOfMonth()->addMonthNoOverflow();

        return [$end->subMonthsNoOverflow(self::MONTHS), $end];
    }

    /**
     * 今月の全日付（グラフの 0 埋め用）。未来の日も含む。
     *
     * @return list<string> 'Y-m-d'
     */
    public function daysOfThisMonth(): array
    {
        [$day, $end] = $this->thisMonth();

        $days = [];
        for (; $day < $end; $day = $day->addDay()) {
            $days[] = $day->format('Y-m-d');
        }

        return $days;
    }

    /**
     * 過去 12 か月の月（古い順。グラフの 0 埋め用）。
     *
     * @return list<string> 'Y-m'
     */
    public function monthsOfLastTwelve(): array
    {
        [$month, $end] = $this->lastTwelveMonths();

        $months = [];
        for (; $month < $end; $month = $month->addMonthNoOverflow()) {
            $months[] = $month->format('Y-m');
        }

        return $months;
    }
}
