<?php

use App\Enums\OrderStatus;
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

it('デモ会員 10 人と、全部「発送済み・決済成功」の注文を作る', function () {
    $this->seed(DemoOrderSeeder::class);

    expect(User::where('email', 'like', 'demo%@example.com')->count())->toBe(10);

    $orders = Order::with(['items', 'payment'])->get();
    expect($orders->count())->toBeGreaterThanOrEqual(20)
        ->and($orders->every(fn (Order $o) => $o->status === OrderStatus::Shipped))->toBeTrue()
        ->and($orders->every(fn (Order $o) => $o->payment?->status === 'succeeded' && $o->payment->amount === $o->total))->toBeTrue()
        ->and($orders->every(fn (Order $o) => $o->items->isNotEmpty() && $o->subtotal === $o->items->sum('line_total')))->toBeTrue()
        ->and($orders->every(fn (Order $o) => $o->shipped_at->greaterThanOrEqualTo($o->paid_at)))->toBeTrue();
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
