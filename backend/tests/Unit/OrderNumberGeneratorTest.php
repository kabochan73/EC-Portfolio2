<?php

use App\Domain\Order\OrderNumberGenerator;
use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;

// 採番は DB の当日分を見るので RefreshDatabase を使う（docs/12-testing.md）。
// 時刻はすべて日本時間で指定する（採番の日付は JST。R4 修正 #1）

uses(RefreshDatabase::class);

function travelToJst(string $datetime): void
{
    Carbon::setTestNow(Carbon::parse($datetime, 'Asia/Tokyo'));
}

it('formats the number as EC-YYYYMMDD-0001 for the first order of the day', function () {
    travelToJst('2026-09-08 10:00:00');

    expect((new OrderNumberGenerator)->generate())->toBe('EC-20260908-0001');
});

it('increments the daily sequence', function () {
    travelToJst('2026-09-08 10:00:00');
    $user = User::factory()->create();
    Order::factory()->for($user)->create(['order_number' => 'EC-20260908-0001']);
    Order::factory()->for($user)->create(['order_number' => 'EC-20260908-0002']);

    expect((new OrderNumberGenerator)->generate())->toBe('EC-20260908-0003');
});

it('starts a fresh sequence on a new day', function () {
    $user = User::factory()->create();
    travelToJst('2026-09-08 23:59:00');
    Order::factory()->for($user)->create(['order_number' => 'EC-20260908-0007']);

    travelToJst('2026-09-09 00:01:00');

    expect((new OrderNumberGenerator)->generate())->toBe('EC-20260909-0001');
});

it('uses the Japanese date even when UTC is still the previous day', function () {
    // JST 2026-09-09 08:30 = UTC 2026-09-08 23:30。R3 はここで 20260908 を返していた
    travelToJst('2026-09-09 08:30:00');

    expect(now()->utc()->format('Ymd'))->toBe('20260908')
        ->and((new OrderNumberGenerator)->generate())->toBe('EC-20260909-0001');
});

it('continues after the highest number even when the sequence has gaps', function () {
    travelToJst('2026-09-08 10:00:00');
    $user = User::factory()->create();
    // 連番が飛んでいる（0001 が無く 0002 だけ）状況でも衝突しない番号を返す
    Order::factory()->for($user)->create(['order_number' => 'EC-20260908-0002']);

    expect((new OrderNumberGenerator)->generate())->toBe('EC-20260908-0003');
});

afterEach(fn () => Carbon::setTestNow());
