<?php

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;

// config('shop.low_stock_threshold') = 5

it('counts what the admin has to do: unshipped, awaiting delivery and stock alerts', function () {
    Order::factory()->count(2)->paid()->create();   // 未発送
    Order::factory()->shipped()->create();          // 受け取り待ち
    Order::factory()->create(['status' => OrderStatus::Completed]);
    Order::factory()->pending()->create();          // 決済待ちは出さない（30 分で自動キャンセル）
    Order::factory()->cancelled()->create();

    // 在庫アラート（公開商品・全 variant 合算）
    $soldOut = Product::factory()->create();
    ProductVariant::factory()->for($soldOut)->create(['size' => 'S', 'stock' => 0]);
    ProductVariant::factory()->for($soldOut)->create(['size' => 'M', 'stock' => 0]);

    $low = Product::factory()->create();
    ProductVariant::factory()->for($low)->create(['size' => 'S', 'stock' => 2]);
    ProductVariant::factory()->for($low)->create(['size' => 'M', 'stock' => 3]); // 合算 5 = low

    $ok = Product::factory()->create();
    ProductVariant::factory()->for($ok)->create(['size' => 'S', 'stock' => 20]);

    // 未公開は在庫アラートに含めない
    $hiddenSoldOut = Product::factory()->unpublished()->create();
    ProductVariant::factory()->for($hiddenSoldOut)->create(['size' => 'S', 'stock' => 0]);

    $this->actingAs(User::factory()->admin()->create())
        ->getJson('/api/admin/stats')
        ->assertOk()
        ->assertExactJsonStructure(['data' => [
            'unshipped_count', 'awaiting_delivery_count', 'low_stock_count', 'sold_out_count',
            'unshipped_orders' => ['*' => ['order_number', 'status', 'total', 'item_count', 'customer' => ['id', 'name', 'email'], 'placed_at', 'paid_at']],
        ]])
        ->assertJsonPath('data.unshipped_count', 2)
        ->assertJsonPath('data.awaiting_delivery_count', 1)
        ->assertJsonPath('data.sold_out_count', 1)
        ->assertJsonPath('data.low_stock_count', 1);
});

it('lists only unshipped (paid) orders, oldest payment first, up to twenty like the order list', function () {
    $newest = Order::factory()->paid()->create(['paid_at' => now()->subHour()]);
    $oldest = Order::factory()->paid()->create(['paid_at' => now()->subDays(3)]);
    Order::factory()->count(19)->paid()->create(['paid_at' => now()->subDay()]);
    Order::factory()->shipped()->create(['paid_at' => now()->subDays(5)]); // 発送済みは並ばない

    $orders = $this->actingAs(User::factory()->admin()->create())
        ->getJson('/api/admin/stats')
        ->assertOk()
        ->json('data.unshipped_orders');

    expect($orders)->toHaveCount(20)
        ->and($orders[0]['order_number'])->toBe($oldest->order_number)
        ->and(array_column($orders, 'status'))->each->toBe('paid')
        ->and(array_column($orders, 'order_number'))->not->toContain($newest->order_number); // 21 件目
});

it('rejects a non-admin', function () {
    $this->actingAs(User::factory()->create())
        ->getJson('/api/admin/stats')
        ->assertForbidden();
});
