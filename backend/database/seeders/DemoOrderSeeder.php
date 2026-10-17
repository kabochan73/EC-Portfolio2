<?php

namespace Database\Seeders;

use App\Enums\OrderStatus;
use App\Enums\UserRole;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * 売上ダッシュボードを見せるためのデモ注文（R4 追加。2026-10-17 ユーザーの案）。
 *
 * - デモ会員 10 人（demo01〜10@example.com。ログインは想定しないのでパスワードはランダム）
 * - 各会員が過去 12 か月のあいだに 2〜5 回、1〜3 品（各 1〜2 個）を買う。全部「支払い済み → 発送済み」
 * - 日付は「流した日」が基準。今月と先月は多めにして、日別グラフと前月比が寂しくならないようにする
 * - 流し直すと、デモ会員の注文を消して作り直す（月が変わると「今月」が空になるので、見せる前に流し直す）
 *
 * 本番のイメージには Faker（開発用パッケージ）が入らないので、factory は使わずに値を直接書く。
 * 注文処理（Action）を通さず DB に直接入れるので、在庫は減らさず、メールも送らない。
 * ProductSeeder が先に必要。DatabaseSeeder からは呼ばない:
 *   php artisan db:seed --class=DemoOrderSeeder --force
 */
class DemoOrderSeeder extends Seeder
{
    /** 乱数のシード。同じ日に流せば同じデータになる */
    private const RANDOM_SEED = 20261017;

    private const TIME_ZONE = 'Asia/Tokyo';

    /** [名前, 郵便番号, 都道府県, 市区町村, 番地] */
    private const CUSTOMERS = [
        ['佐藤 美咲', '150-0001', '東京都', '渋谷区神宮前', '1-2-3'],
        ['鈴木 大輔', '060-0042', '北海道', '札幌市中央区大通西', '4-5-6'],
        ['高橋 結衣', '530-0001', '大阪府', '大阪市北区梅田', '2-4-9'],
        ['田中 翔太', '460-0008', '愛知県', '名古屋市中区栄', '3-1-1'],
        ['伊藤 さくら', '810-0001', '福岡県', '福岡市中央区天神', '1-8-1'],
        ['渡辺 健', '980-0811', '宮城県', '仙台市青葉区一番町', '2-2-2'],
        ['山本 葵', '604-8005', '京都府', '京都市中京区恵比須町', '5-3-7'],
        ['中村 蓮', '220-0012', '神奈川県', '横浜市西区みなとみらい', '3-6-1'],
        ['小林 陽菜', '730-0011', '広島県', '広島市中区基町', '6-7-8'],
        ['加藤 悠真', '900-0015', '沖縄県', '那覇市久茂地', '1-1-1'],
    ];

    public function run(): void
    {
        mt_srand(self::RANDOM_SEED);

        $products = Product::query()->with(['variants', 'images'])->get()->filter(fn (Product $p) => $p->variants->isNotEmpty())->values();
        if ($products->isEmpty()) {
            $this->command?->warn('商品がありません。先に ProductSeeder を流してください。');

            return;
        }

        DB::transaction(function () use ($products) {
            $customers = $this->upsertCustomers();

            // 作り直し: デモ会員の注文を消す（明細・決済は cascade で消える）
            Order::query()->whereIn('user_id', $customers->pluck('id'))->delete();

            foreach ($this->orderDates() as $paidAt) {
                $index = mt_rand(0, $customers->count() - 1);
                $this->createOrder($customers[$index], self::CUSTOMERS[$index], $products, $paidAt);
            }
        });

        mt_srand(); // ほかの処理の乱数に影響しないよう戻す
    }

    /** @return \Illuminate\Support\Collection<int, User> */
    private function upsertCustomers()
    {
        return collect(self::CUSTOMERS)->map(function (array $customer, int $index) {
            $number = str_pad((string) ($index + 1), 2, '0', STR_PAD_LEFT);
            $user = User::firstOrNew(['email' => "demo{$number}@example.com"]);
            if (! $user->exists) {
                $user->fill([
                    'name' => $customer[0],
                    'password' => Hash::make(Str::random(32)),
                    'role' => UserRole::Customer,
                ]);
                $user->created_at = now()->subMonths(13);
                $user->save();
            }

            return $user;
        });
    }

    /**
     * 注文の日時（paid_at）。11〜2 か月前は月 1〜3 件、先月と今月は 6 件前後。
     * 今月の分は「今日まで」に収める
     *
     * @return list<Carbon>
     */
    private function orderDates(): array
    {
        $now = now(self::TIME_ZONE);
        $dates = [];

        for ($monthsAgo = 11; $monthsAgo >= 0; $monthsAgo--) {
            $month = $now->copy()->startOfMonth()->subMonthsNoOverflow($monthsAgo);
            $lastDay = $monthsAgo === 0 ? $now->day : $month->daysInMonth;
            $count = $monthsAgo <= 1 ? mt_rand(5, 7) : mt_rand(1, 3);

            for ($i = 0; $i < $count; $i++) {
                $paidAt = $month->copy()->day(mt_rand(1, $lastDay))->setTime(mt_rand(9, 22), mt_rand(0, 59));
                // 今日の分がまだ来ていない時刻になったら、少し前にずらす
                $dates[] = $paidAt->greaterThan($now) ? $now->copy()->subMinutes(mt_rand(10, 120)) : $paidAt;
            }
        }

        usort($dates, fn (Carbon $a, Carbon $b) => $a <=> $b);

        return $dates;
    }

    /**
     * @param  list<string>  $address  CUSTOMERS の 1 行
     * @param  \Illuminate\Support\Collection<int, Product>  $products
     */
    private function createOrder(User $customer, array $address, $products, Carbon $paidAt): void
    {
        $lines = $products->random(mt_rand(1, 3))->map(function (Product $product) {
            $variant = $product->variants->random();
            $quantity = mt_rand(1, 2);

            return [
                'product_id' => $product->id,
                'product_variant_id' => $variant->id,
                'product_name' => $product->name,
                'variant_size' => $variant->size,
                'variant_color' => $variant->color,
                'image_url' => $product->images->first()?->url() ?? '',
                'unit_price' => $product->price,
                'quantity' => $quantity,
                'line_total' => $product->price * $quantity,
            ];
        });

        $subtotal = $lines->sum('line_total');
        $shippingFee = $subtotal >= config('shop.free_shipping_threshold') ? 0 : (int) config('shop.shipping_fee');
        $placedAt = $paidAt->copy()->subMinutes(mt_rand(2, 15));
        // 発送は 1〜3 日後。まだ来ていなければ今にする
        $shippedAt = $paidAt->copy()->addDays(mt_rand(1, 3))->setTime(mt_rand(10, 18), 0);
        if ($shippedAt->isFuture()) {
            $shippedAt = now(self::TIME_ZONE);
        }
        [$name, $postalCode, $prefecture, $city, $line1] = $address;

        $order = new Order([
            'user_id' => $customer->id,
            'order_number' => $this->nextOrderNumber($placedAt),
            'status' => OrderStatus::Shipped,
            'subtotal' => $subtotal,
            'shipping_fee' => $shippingFee,
            'total' => $subtotal + $shippingFee,
            // DB は UTC。日本時間の Carbon をそのまま入れると、壁時計の時刻のまま保存されて 9 時間ずれる
            'paid_at' => $paidAt->copy()->utc(),
            'shipped_at' => $shippedAt->copy()->utc(),
            'ship_recipient_name' => $name,
            'ship_postal_code' => $postalCode,
            'ship_prefecture' => $prefecture,
            'ship_city' => $city,
            'ship_address_line1' => $line1,
            'ship_phone' => '090'.str_pad((string) mt_rand(0, 99999999), 8, '0', STR_PAD_LEFT),
        ]);
        $order->created_at = $placedAt->copy()->utc();
        $order->save();

        $order->items()->createMany($lines->all());
        $order->payment()->create([
            'stripe_payment_intent_id' => 'pi_demo_'.$order->order_number,
            'status' => 'succeeded',
            'amount' => $order->total,
            'stripe_charge_id' => 'ch_demo_'.$order->order_number,
        ]);
    }

    /**
     * 注文日（日本時間）の EC-YYYYMMDD-NNNN。その日の最大の連番 + 1（OrderNumberGenerator と同じ考え方）。
     * 本物の注文と同じ日でも番号はぶつからない
     */
    private function nextOrderNumber(Carbon $placedAt): string
    {
        $prefix = config('shop.order_number_prefix');
        $date = $placedAt->copy()->setTimezone(self::TIME_ZONE)->format('Ymd');

        $max = (int) Order::query()
            ->where('order_number', 'like', "{$prefix}-{$date}-%")
            ->pluck('order_number')
            ->map(fn (string $number) => (int) substr($number, -4))
            ->max();

        return sprintf('%s-%s-%04d', $prefix, $date, $max + 1);
    }
}
