<?php

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;

// config('shop.low_stock_threshold') = 5

it('reports order counts, revenue and stock alerts', function () {
    // 売上に入るのは paid / shipped / completed のみ
    Order::factory()->paid()->create(['total' => 10_000]);
    Order::factory()->shipped()->create(['total' => 20_000]);
    Order::factory()->create(['status' => OrderStatus::Completed, 'total' => 5_000]);
    Order::factory()->pending()->create(['total' => 99_000]);   // revenue に入らない
    Order::factory()->cancelled()->create(['total' => 88_000]); // revenue に入らない

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
        ->assertJsonPath('data.orders_count', 5)
        ->assertJsonPath('data.revenue_total', 35_000)
        ->assertJsonPath('data.pending_count', 1)
        ->assertJsonPath('data.sold_out_count', 1)
        ->assertJsonPath('data.low_stock_count', 1)
        ->assertJsonStructure(['data' => ['recent_orders' => [['order_number', 'status', 'total', 'customer']]]]);
});

it('caps recent_orders at five, newest first', function () {
    Order::factory()->count(8)->create();

    $recent = $this->actingAs(User::factory()->admin()->create())
        ->getJson('/api/admin/stats')
        ->assertOk()
        ->json('data.recent_orders');

    expect($recent)->toHaveCount(5);
});

it('rejects a non-admin', function () {
    $this->actingAs(User::factory()->create())
        ->getJson('/api/admin/stats')
        ->assertForbidden();
});
