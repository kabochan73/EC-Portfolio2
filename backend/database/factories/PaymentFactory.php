<?php

namespace Database\Factories;

use App\Models\Order;
use App\Models\Payment;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Payment>
 */
class PaymentFactory extends Factory
{
    public function definition(): array
    {
        return [
            'order_id' => Order::factory(),
            'provider' => 'stripe',
            'stripe_payment_intent_id' => 'pi_'.Str::random(24),
            'status' => 'requires_payment_method',
            'amount' => fake()->numberBetween(30, 300) * 100,
            'currency' => 'jpy',
            'stripe_charge_id' => null,
            'refunded_at' => null,
            'last_error' => null,
        ];
    }

    public function succeeded(): static
    {
        return $this->state(fn () => [
            'status' => 'succeeded',
            'stripe_charge_id' => 'ch_'.Str::random(24),
        ]);
    }

    public function refunded(): static
    {
        return $this->succeeded()->state(fn () => ['refunded_at' => now()]);
    }
}
