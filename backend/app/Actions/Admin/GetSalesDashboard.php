<?php

namespace App\Actions\Admin;

use App\Domain\Sales\SalesPeriod;
use App\Enums\OrderStatus;
use App\Models\Category;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

/**
 * 売上ダッシュボードの集計（docs/05-admin.md 売上ダッシュボード。R4 の新機能）。
 *
 * 集計ルール（全パーツ共通）:
 *  - 売上 = status が paid / shipped / completed の注文（pending と cancelled は除く）
 *  - 日付は paid_at（決済が成立した時刻）を日本時間に直して区切る
 *  - 期間の絞り込みは UTC に直した範囲で WHERE（orders(status, paid_at) インデックスが効く）、
 *    日・月ごとのまとめは SQL で JST に変換してから GROUP BY
 */
final class GetSalesDashboard
{
    /** paid_at（UTC の timestamp）を日本時間の時刻に変換する SQL 式 */
    private const PAID_AT_JST = "(orders.paid_at AT TIME ZONE 'UTC') AT TIME ZONE '".SalesPeriod::TIMEZONE."'";

    /**
     * @param  string|null  $rankingMonth  ランキングの月（'Y-m'）。null なら今月（R4 追加。KPI・グラフは常に今月 / 過去 12 か月）
     * @return array{kpi: array<string, int>, daily: list<array<string, mixed>>, monthly: list<array<string, mixed>>, ranking_month: string, ranking: list<array<string, mixed>>}
     */
    public function execute(SalesPeriod $period, ?string $rankingMonth = null): array
    {
        $rankingMonth ??= $period->currentMonth();

        return [
            'kpi' => $this->kpi($period),
            'daily' => $this->revenueSeries($period->thisMonth(), 'YYYY-MM-DD', 'date', $period->daysOfThisMonth()),
            'monthly' => $this->revenueSeries($period->lastTwelveMonths(), 'YYYY-MM', 'month', $period->monthsOfLastTwelve()),
            'ranking_month' => $rankingMonth,
            'ranking' => $this->ranking($period, $rankingMonth),
        ];
    }

    /** @return array{month_revenue: int, month_orders: int, today_revenue: int} */
    private function kpi(SalesPeriod $period): array
    {
        $month = $this->salesOrders($period->thisMonth())
            ->selectRaw('coalesce(sum(total), 0) as revenue, count(*) as orders')
            ->first();

        return [
            'month_revenue' => (int) $month->revenue,
            'month_orders' => (int) $month->orders,
            'today_revenue' => (int) $this->salesOrders($period->today())->sum('total'),
        ];
    }

    /**
     * 期間内の売上を日 or 月ごとにまとめ、売上の無い日・月も 0 で埋めて返す。
     *
     * @param  array{0: CarbonImmutable, 1: CarbonImmutable}  $range
     * @param  list<string>  $labels  埋める日付 or 月の一覧（古い順）
     * @return list<array<string, int|string>>
     */
    private function revenueSeries(array $range, string $format, string $key, array $labels): array
    {
        $revenues = $this->salesOrders($range)
            ->selectRaw('to_char('.self::PAID_AT_JST.", '{$format}') as label, sum(total) as revenue")
            ->groupBy('label')
            ->pluck('revenue', 'label');

        return array_map(
            fn (string $label) => [$key => $label, 'revenue' => (int) ($revenues[$label] ?? 0)],
            $labels,
        );
    }

    /**
     * カテゴリごとに、そのカテゴリの全商品を「選んだ月」の販売個数順に並べる（同数なら売上順）。
     * 前月比 = 選んだ月の個数 ÷ その前の月 1 か月分の個数（前の月が 0 個なら null）。削除済み商品は対象外。
     * R4（2026-10-17）: 月を選べるようにした。それまでは今月 ÷ 先月の固定（キー名 last_month_quantity はそのまま）
     *
     * @return list<array<string, mixed>>
     */
    private function ranking(SalesPeriod $period, string $month): array
    {
        $thisMonth = $this->soldByProduct($period->month($month));
        $lastMonth = $this->soldByProduct($period->monthBefore($month));

        // 管理画面なので非公開の商品も含める（非公開にしたが、その月は売れていた商品も見えるように）
        $categories = Category::query()
            ->ordered()
            ->with(['products' => fn ($q) => $q->ordered()])
            ->get();

        return $categories->map(fn (Category $category) => [
            'category' => ['id' => $category->id, 'name' => $category->name],
            'products' => $category->products
                ->map(function (Product $product) use ($thisMonth, $lastMonth) {
                    $quantity = (int) ($thisMonth[$product->id]->quantity ?? 0);
                    $lastQuantity = (int) ($lastMonth[$product->id]->quantity ?? 0);

                    return [
                        'id' => $product->id,
                        'name' => $product->name,
                        'quantity' => $quantity,
                        'revenue' => (int) ($thisMonth[$product->id]->revenue ?? 0),
                        'last_month_quantity' => $lastQuantity,
                        'mom_ratio' => $lastQuantity > 0 ? round($quantity / $lastQuantity, 2) : null,
                    ];
                })
                // 個数の多い順 → 同数なら売上の多い順（ordered() の position 順は sortBy が保つ）
                ->sortBy([['quantity', 'desc'], ['revenue', 'desc']])
                ->values()
                ->all(),
        ])->all();
    }

    /**
     * 期間内に売れた商品ごとの個数と売上（明細の line_total）。
     *
     * @param  array{0: CarbonImmutable, 1: CarbonImmutable}  $range
     * @return Collection<int, OrderItem> product_id => {quantity, revenue}
     */
    private function soldByProduct(array $range): Collection
    {
        return OrderItem::query()
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->whereIn('orders.status', $this->salesStatuses())
            ->where('orders.paid_at', '>=', $range[0]->utc())
            ->where('orders.paid_at', '<', $range[1]->utc())
            ->whereNotNull('order_items.product_id')
            ->groupBy('order_items.product_id')
            ->selectRaw('order_items.product_id, sum(order_items.quantity) as quantity, sum(order_items.line_total) as revenue')
            ->get()
            ->keyBy('product_id');
    }

    /**
     * 売上として数える注文を、期間（JST の範囲を UTC に直したもの）で絞り込む。
     * Laravel は Carbon を時差の変換なしで文字列にするので、必ず ->utc() してから渡す。
     *
     * @param  array{0: CarbonImmutable, 1: CarbonImmutable}  $range
     * @return Builder<Order>
     */
    private function salesOrders(array $range): Builder
    {
        return Order::query()
            ->whereIn('status', $this->salesStatuses())
            ->where('paid_at', '>=', $range[0]->utc())
            ->where('paid_at', '<', $range[1]->utc());
    }

    /** @return list<string> */
    private function salesStatuses(): array
    {
        return [OrderStatus::Paid->value, OrderStatus::Shipped->value, OrderStatus::Completed->value];
    }
}
