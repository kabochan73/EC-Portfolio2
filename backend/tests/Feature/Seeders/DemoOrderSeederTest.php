<?php

use App\Models\Order;
use App\Models\ProductVariant;
use App\Models\User;
use Database\Seeders\CategorySeeder;
use Database\Seeders\DemoOrderSeeder;
use Database\Seeders\ProductSeeder;
use Illuminate\Support\Carbon;

// 売上ダッシュボード用のデモ注文（R4 追加）。本番で流すので、Faker なしで動くこと・流し直しで増えないことを確かめる

beforeEach(function () {
    $this->seed([CategorySeeder::class, ProductSeeder::class]);
});

afterEach(function () {
    Carbon::setTestNow();
});

it('デモ会員 10 人と、決済成功の注文を作る。状態は古さで paid / shipped / completed に分ける', function () {
    Carbon::setTestNow(Carbon::parse('2026-10-17 12:00', 'Asia/Tokyo'));
    $this->seed(DemoOrderSeeder::class);

    expect(User::where('email', 'like', 'demo%@example.com')->count())->toBe(10);

    $orders = Order::with(['items', 'payment'])->get();
    expect($orders->count())->toBeGreaterThanOrEqual(20)
        ->and($orders->every(fn (Order $o) => $o->payment?->status === 'succeeded' && $o->payment->amount === $o->total))->toBeTrue()
        ->and($orders->every(fn (Order $o) => $o->items->isNotEmpty() && $o->subtotal === $o->items->sum('line_total')))->toBeTrue();

    $byStatus = $orders->groupBy(fn (Order $o) => $o->status->value);
    expect(array_keys($byStatus->all()))->toEqualCanonicalizing(['paid', 'shipped', 'completed'])
        // 未発送（paid）は直近 2 日で、発送日なし。必ず 2 件以上ある
        ->and($byStatus['paid']->count())->toBeGreaterThanOrEqual(2)
        ->and($byStatus['paid']->every(fn (Order $o) => $o->shipped_at === null && $o->paid_at->greaterThan(now()->subHours(48))))->toBeTrue()
        // 受け取り待ち（shipped）は 2〜14 日前、完了（completed）はそれより前。どちらも発送日は決済日より後
        ->and($byStatus['shipped']->every(fn (Order $o) => $o->paid_at->between(now()->subDays(14), now()->subHours(48))))->toBeTrue()
        ->and($byStatus['completed']->every(fn (Order $o) => $o->paid_at->lessThanOrEqualTo(now()->subDays(14))))->toBeTrue()
        ->and($orders->whereNotNull('shipped_at')->every(fn (Order $o) => $o->shipped_at->greaterThanOrEqualTo($o->paid_at)))->toBeTrue();
});

it('日付は過去 12 か月に収まり、今月と先月の注文がある（日本時間）', function () {
    Carbon::setTestNow(Carbon::parse('2026-10-17 12:00', 'Asia/Tokyo'));
    $this->seed(DemoOrderSeeder::class);

    $paid = Order::pluck('paid_at')->map(fn (Carbon $at) => $at->copy()->setTimezone('Asia/Tokyo'));
    expect($paid->min()->greaterThanOrEqualTo(Carbon::parse('2025-11-01', 'Asia/Tokyo')))->toBeTrue()
        ->and($paid->max()->lessThanOrEqualTo(now()))->toBeTrue()
        ->and($paid->filter(fn (Carbon $at) => $at->format('Y-m') === '2026-10')->count())->toBeGreaterThanOrEqual(5)
        ->and($paid->filter(fn (Carbon $at) => $at->format('Y-m') === '2026-09')->count())->toBeGreaterThanOrEqual(5);
});

it('注文番号は注文日（日本時間）の EC-YYYYMMDD-NNNN', function () {
    $this->seed(DemoOrderSeeder::class);

    Order::all()->each(function (Order $order) {
        $date = $order->created_at->copy()->setTimezone('Asia/Tokyo')->format('Ymd');
        expect($order->order_number)->toMatch("/^EC-{$date}-\\d{4}$/");
    });
});

it('流し直すとデモの注文を作り直す（増えない）。本物の会員の注文と在庫には触らない', function () {
    $real = Order::factory()->paid()->create();
    $stockBefore = ProductVariant::pluck('stock', 'id');

    $this->seed(DemoOrderSeeder::class);
    $firstCount = Order::count();
    $this->seed(DemoOrderSeeder::class);

    expect(Order::count())->toBe($firstCount)
        ->and(User::where('email', 'like', 'demo%@example.com')->count())->toBe(10)
        ->and(Order::whereKey($real->id)->exists())->toBeTrue()
        ->and(ProductVariant::pluck('stock', 'id'))->toEqual($stockBefore);
});
