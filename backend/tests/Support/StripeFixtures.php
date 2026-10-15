<?php

namespace Tests\Support;

use Stripe\Event;

/**
 * テスト用の疑似 Stripe イベント（docs/12-testing.md）。
 * ネットワークは一切叩かない。StripeService::constructWebhookEvent をモックして
 * ここで作った Event を返す。
 */
final class StripeFixtures
{
    /**
     * @param  array<string, mixed>  $objectOverrides  data.object にマージする値
     */
    public static function event(string $type, array $objectOverrides = [], string $id = 'evt_test_1'): Event
    {
        return Event::constructFrom([
            'id' => $id,
            'type' => $type,
            'object' => 'event',
            'api_version' => '2024-06-20',
            'created' => 1_700_000_000,
            'data' => [
                'object' => array_replace_recursive(self::baseObject($type), $objectOverrides),
            ],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private static function baseObject(string $type): array
    {
        return match (true) {
            str_starts_with($type, 'payment_intent.') => [
                'id' => 'pi_test_1',
                'object' => 'payment_intent',
                'amount' => 6_800,
                'currency' => 'jpy',
                'status' => 'succeeded',
                'latest_charge' => 'ch_test_1',
                'metadata' => ['order_id' => '0', 'order_number' => 'EC-x'],
                'last_payment_error' => null,
            ],
            str_starts_with($type, 'charge.') => [
                'id' => 'ch_test_1',
                'object' => 'charge',
                'payment_intent' => 'pi_test_1',
                'amount' => 6_800,
                'amount_refunded' => 6_800,
                'refunded' => true,
            ],
            default => [],
        };
    }
}
