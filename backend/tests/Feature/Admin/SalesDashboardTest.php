<?php

use App\Enums\OrderStatus;
use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Carbon;

// GET /api/admin/sales（売上ダッシュボード。docs/05-admin.md。R4 の新機能）。
// 「今」は JST 2026-10-16 15:00 に固定。日付はすべて日本時間で書く。

beforeEach(fn () => Carbon::setTestNow(CarbonImmutable::parse('2026-10-16 15:00', 'Asia/Tokyo')));
afterEach(fn () => Carbon::setTestNow());

/**
 * 決済日時（JST）と明細を指定して注文を作る。total は明細の合計（送料 0）にそろえる。
 *
 * @param  list<array{0: Product, 1: int}>  $lines  [商品, 個数]
 */
function soldOrder(string $paidAtJst, array $lines, OrderStatus $status = OrderStatus::Paid): Order
{
    $total = array_sum(array_map(fn ($line) => $line[0]->price * $line[1], $lines));

    $order = Order::factory()->for(User::factory())->create([
        'status' => $status,
        'paid_at' => $status === OrderStatus::Pending ? null : CarbonImmutable::parse($paidAtJst, 'Asia/Tokyo')->utc(),
        'subtotal' => $total,
        'shipping_fee' => 0,
        'total' => $total,
    ]);

    foreach ($lines as [$product, $quantity]) {
        $order->items()->create([
            'product_id' => $product->id,
            'product_name' => $product->name,
            'variant_size' => 'M',
            'unit_price' => $product->price,
            'quantity' => $quantity,
            'line_total' => $product->price * $quantity,
        ]);
    }

    return $order;
}

function salesData(): array
{
    return test()->actingAs(admin())->getJson('/api/admin/sales')->assertOk()->json('data');
}

it('sums only paid, shipped and completed orders into the KPIs', function () {
    $tee = Product::factory()->create(['price' => 10_000]);

    soldOrder('2026-10-16 09:00', [[$tee, 1]], OrderStatus::Paid);       // 今日
    soldOrder('2026-10-10 12:00', [[$tee, 2]], OrderStatus::Shipped);
    soldOrder('2026-10-05 12:00', [[$tee, 3]], OrderStatus::Completed);
    soldOrder('2026-10-16 10:00', [[$tee, 9]], OrderStatus::Cancelled);  // 除外
    soldOrder('2026-10-16 11:00', [[$tee, 9]], OrderStatus::Pending);    // 除外（未決済）
    soldOrder('2026-09-30 12:00', [[$tee, 9]], OrderStatus::Paid);       // 先月なので今月の KPI には入らない

    expect(salesData()['kpi'])->toBe([
        'month_revenue' => 60_000,
        'month_orders' => 3,
        'today_revenue' => 10_000,
    ]);
});

it('splits days and months by Japanese time, not UTC', function () {
    $tee = Product::factory()->create(['price' => 10_000]);

    // JST 10/01 00:30 = UTC 09/30 15:30 → 10 月 1 日の売上
    soldOrder('2026-10-01 00:30', [[$tee, 1]]);
    // JST 09/30 23:30 = UTC 09/30 14:30 → 9 月の売上（10 月には入らない）
    soldOrder('2026-09-30 23:30', [[$tee, 2]]);

    $data = salesData();

    expect($data['kpi']['month_revenue'])->toBe(10_000)
        ->and($data['daily'][0])->toBe(['date' => '2026-10-01', 'revenue' => 10_000])
        ->and(array_slice($data['monthly'], -2))->toBe([
            ['month' => '2026-09', 'revenue' => 20_000],
            ['month' => '2026-10', 'revenue' => 10_000],
        ]);
});

it('fills every day of the month and the last twelve months, zeros included', function () {
    $data = salesData(); // 売上ゼロ

    expect($data['daily'])->toHaveCount(31)
        ->and($data['daily'][0])->toBe(['date' => '2026-10-01', 'revenue' => 0])
        ->and($data['daily'][30])->toBe(['date' => '2026-10-31', 'revenue' => 0]) // 未来の日も 0
        ->and($data['monthly'])->toHaveCount(12)
        ->and($data['monthly'][0]['month'])->toBe('2025-11')
        ->and($data['monthly'][11]['month'])->toBe('2026-10')
        ->and($data['kpi'])->toBe(['month_revenue' => 0, 'month_orders' => 0, 'today_revenue' => 0]);
});

it('ranks every product of a category by quantity, then revenue, with the month-over-month ratio', function () {
    $tops = Category::factory()->create(['name' => 'Tops', 'position' => 0]);
    $tee = Product::factory()->for($tops)->create(['name' => 'Tee', 'price' => 10_000, 'position' => 0]);
    $shirt = Product::factory()->for($tops)->create(['name' => 'Shirt', 'price' => 20_000, 'position' => 1]);
    $knit = Product::factory()->for($tops)->create(['name' => 'Knit', 'price' => 30_000, 'position' => 2]);
    $hidden = Product::factory()->for($tops)->unpublished()->create(['name' => 'Hidden', 'price' => 5_000, 'position' => 3]);

    // 今月: Tee 3 個 / Shirt 3 個（同数 → 売上の多い Shirt が上）/ Hidden 1 個 / Knit 0 個
    soldOrder('2026-10-03 12:00', [[$tee, 3], [$shirt, 3]]);
    soldOrder('2026-10-04 12:00', [[$hidden, 1]]);
    // 先月: Tee 2 個 / Knit 1 個
    soldOrder('2026-09-15 12:00', [[$tee, 2], [$knit, 1]]);

    $products = salesData()['ranking'][0]['products'];

    expect(array_column($products, 'name'))->toBe(['Shirt', 'Tee', 'Hidden', 'Knit'])
        ->and($products[0])->toBe([
            'id' => $shirt->id, 'name' => 'Shirt', 'quantity' => 3, 'revenue' => 60_000,
            'last_month_quantity' => 0, 'mom_ratio' => null, // 先月 0 個 → 前月比なし
        ])
        ->and($products[1]['mom_ratio'])->toBe(1.5)   // 3 ÷ 2
        ->and($products[3]['quantity'])->toBe(0)       // 売れていない商品も並べる
        ->and($products[3]['mom_ratio'])->toEqual(0);  // 0 ÷ 1
});

it('ignores sales of deleted products in the ranking', function () {
    $tops = Category::factory()->create();
    $kept = Product::factory()->for($tops)->create(['price' => 10_000]);
    $gone = Product::factory()->for($tops)->create(['price' => 10_000]);
    soldOrder('2026-10-03 12:00', [[$kept, 1], [$gone, 5]]);

    $gone->delete(); // order_items.product_id は NULL になる

    $data = salesData();

    expect(array_column($data['ranking'][0]['products'], 'id'))->toBe([$kept->id])
        // 注文の売上（KPI）には削除済み商品の分も残る（注文の total は変わらないため）
        ->and($data['kpi']['month_revenue'])->toBe(60_000);
});

it('rejects a non-admin', function () {
    $this->actingAs(User::factory()->create())->getJson('/api/admin/sales')->assertForbidden();
});
