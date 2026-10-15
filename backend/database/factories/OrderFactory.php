<?php

namespace Database\Factories;

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Order>
 */
class OrderFactory extends Factory
{
    public function definition(): array
    {
        $subtotal = fake()->numberBetween(30, 300) * 100;
        $shipping = $subtotal >= config('shop.free_shipping_threshold') ? 0 : config('shop.shipping_fee');
        $seq = fake()->unique()->numberBetween(1, 9999);

        return [
            'user_id' => User::factory(),
            // 注文番号の日付は JST（R4 修正。docs/02）
            'order_number' => 'EC-'.now('Asia/Tokyo')->format('Ymd').'-'.str_pad((string) $seq, 4, '0', STR_PAD_LEFT),
            'status' => OrderStatus::Pending,
            'subtotal' => $subtotal,
            'shipping_fee' => $shipping,
            'total' => $subtotal + $shipping,
            'paid_at' => null,
            'shipped_at' => null,
            'cancelled_at' => null,
            'ship_recipient_name' => fake()->name(),
            'ship_postal_code' => fake()->numerify('###-####'),
            'ship_prefecture' => '東京都',
            'ship_city' => fake()->city(),
            'ship_address_line1' => fake()->streetAddress(),
            'ship_address_line2' => null,
            'ship_phone' => fake()->numerify('0#########'),
        ];
    }

    public function pending(): static
    {
        return $this->state(fn () => ['status' => OrderStatus::Pending]);
    }

    public function paid(): static
    {
        return $this->state(fn () => [
            'status' => OrderStatus::Paid,
            'paid_at' => now(),
        ]);
    }

    public function shipped(): static
    {
        return $this->state(fn () => [
            'status' => OrderStatus::Shipped,
            'paid_at' => now()->subDay(),
            'shipped_at' => now(),
        ]);
    }

    /** 売上ダッシュボードの集計対象（paid / shipped / completed）を揃えるため R4 で追加 */
    public function completed(): static
    {
        return $this->state(fn () => [
            'status' => OrderStatus::Completed,
            'paid_at' => now()->subDays(2),
            'shipped_at' => now()->subDay(),
        ]);
    }

    public function cancelled(): static
    {
        return $this->state(fn () => [
            'status' => OrderStatus::Cancelled,
            'cancelled_at' => now(),
        ]);
    }

    /** 明細付きの注文（一覧・詳細テスト用） */
    public function withItems(int $count = 2): static
    {
        return $this->has(OrderItem::factory()->count($count), 'items');
    }
}
