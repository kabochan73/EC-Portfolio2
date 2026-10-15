# テスト戦略（R4）

## R2 の反省

R2 は「テストを機能実装と並行して書く」と決めていたのに、phpunit のまま1本も書かずに終わった。R3 は:

- **Pest 3** を最初に入れる（Phase 1 Step 6）。
- **Step ごとに、対応するテストを書いてからコミット**。テストの無い Step はコミットしない（純粋な docs / 設定変更を除く）。
- カバレッジ数値は追わない。「壊れたら困る導線」を Feature テストで押さえる。

## 何をテストするか

### Feature テスト（中心。HTTP を叩いて JSON / 副作用を検証）

| 領域 | 押さえるケース |
|---|---|
| カタログ | 公開商品のみ一覧に出る / 未公開 slug は 404 / `?category` `?new` フィルタ / `stock_status` の算出 |
| カート再検証 | 非公開・売り切れ variant が `available: false` |
| 認証 | 登録で 201 + token / ログイン失敗 422 / `throttle:login` / `/api/me` の中身（メール認証は実装しないため対象外・2026-09-14） |
| パスワードリセット | `forgot-password` は存在しないメールでも 200 / トークンで変更成功 / 無効トークン 422 |
| 住所録 | 本人のみ / 他人の id は 404 / デフォルト設定で他が false 化 |
| 注文作成 | 在庫不足 422 + 在庫ロールバック / 未公開商品混入 422 / 金額はサーバー再計算（クライアント値を無視）/ 送料しきい値 / `pending` で作成 + 在庫減算 |
| 決済 | payment-intent 作成（本人・pending のみ）/ 非 pending は 409 / 金額ズレ 409 / キー未設定 503 / 既存 PaymentIntent の再利用 |
| Webhook | `payment_intent.succeeded` で `paid` + 確認メール dispatch / 二重配信で1回だけ / 署名不正 400 / 未対応イベントは 200 / `payment_intent.canceled` で在庫復元 |
| 注文ステータス | state machine の許可遷移 / 不正遷移 422 / `paid→cancelled` で返金 + 在庫復元 / `paid→shipped` で発送メール |
| 管理 API | 非 admin 403 / 未認証 401 / 商品・カテゴリ・バリアント CRUD / カテゴリ削除 409 / ダッシュボード `revenue_total` |
| CMS | `GET /api/content` がデフォルト補完 / `PUT` の rules / 不正 key 404 / 非 admin 403 |

### Unit テスト（純粋ロジックだけ）

- `Domain\Order\ShippingFeeCalculator::for()`（境界: 19999 / 20000 / 20001）
- `Domain\Order\OrderNumberGenerator::generate()`（日付内連番・日跨ぎ・UNIQUE 衝突リトライ）
- `Enums\StockStatus::fromStock()`（0 / 3 / 4）
- `Enums\OrderStatus::canTransitionTo()` / `transitions()`（全遷移マトリクス）

## 構成

```
backend/tests/
├── Pest.php                 # uses(RefreshDatabase::class)->in('Feature')
├── TestCase.php
├── Feature/
│   ├── Catalog/  Auth/  PasswordReset/  Address/
│   ├── Order/    Payment/  Webhook/
│   └── Admin/    Content/
├── Unit/
│   ├── ShippingFeeCalculatorTest.php
│   ├── OrderNumberGeneratorTest.php
│   ├── StockStatusTest.php
│   └── OrderStatusTransitionTest.php
└── Support/
    ├── StripeFixtures.php    # 疑似 Stripe イベント JSON を組み立てるヘルパ
    └── helpers.php
```

- 実 DB（Postgres）で回す。`RefreshDatabase`。CI でも同じ Postgres コンテナ。
- Repository パターンを使わない設計なので、DB を挟んだテストが自然（`docs/06` §12）。

## Stripe のテスト方法

**ネットワークを一切叩かない。** `StripeService` をモックする。

```php
// tests/Support/StripeFixtures.php
function stripe_event(string $type, array $objectOverrides = []): \Stripe\Event
{
    $base = json_decode(file_get_contents(__DIR__."/fixtures/{$type}.json"), true);
    $base['data']['object'] = array_replace_recursive($base['data']['object'], $objectOverrides);
    return \Stripe\Event::constructFrom($base);
}
```

```php
beforeEach(function () {
    $this->stripe = $this->mock(StripeService::class);
});

it('marks the order paid', function () {
    $order = Order::factory()->pending()->has(Payment::factory())->create();
    $this->stripe->shouldReceive('constructWebhookEvent')
        ->andReturn(stripe_event('payment_intent.succeeded', [
            'metadata' => ['order_id' => (string) $order->id],
            'latest_charge' => 'ch_x',
        ]));

    postJson('/api/stripe/webhook', ['x' => 1], ['Stripe-Signature' => 'x'])->assertOk();

    expect($order->fresh()->status)->toBe(OrderStatus::Paid);
});
```

`CreatePaymentIntent` のテストも `StripeService::createPaymentIntent` をモックして `Stripe\PaymentIntent::constructFrom([...])` を返す。

## メール・キューのテスト

```php
Mail::fake(); Queue::fake();
// パスワードリセット
postJson('/api/forgot-password', ['email' => $user->email])->assertOk();
Queue::assertPushed(SendPasswordResetJob::class);
// ジョブを同期実行してメールを確認したいときは Bus::fake() を使わず、Job を直接 new して handle()
(new SendPasswordResetJob($user->id, 'token'))->handle();
Mail::assertSent(ResetPasswordMail::class, fn ($m) => $m->hasTo($user->email));
```

## Factory 方針

- 全モデルに Factory。Seeder は Factory を呼ぶ。
- 状態メソッド: `Product::factory()->unpublished()`、`ProductVariant::factory()->soldOut()` / `->lowStock()`、`Order::factory()->pending()` / `->paid()` / `->shipped()`、`User::factory()->admin()`。
- `Order::factory()` は `order_items` を伴わない素の注文も作れる（一覧テスト用）。`->withItems(int $n)` で明細付き。
- `OrderItemFactory` の `image_url` は空文字デフォルト（R2 で未着手だった調整をここで入れる。画像必須にしない）。

## フロントのテスト

- 自動 E2E（Playwright 等）は R3 でも**入れない**（一人の学習プロジェクトで維持コストに見合わない）。
- 代わりに毎 Step: `docker compose exec frontend npx tsc --noEmit` + `npm run lint` を通す。
- 主要導線（トップ表示・商品詳細・カート→チェックアウト→決済→完了・ログイン・管理画面の CRUD・CMS 編集→反映）は CDP or 手動で1回ずつ確認し、`rebuild-log` に記録。
- CDP のモバイル幅は `Emulation.setDeviceMetricsOverride` を使う（R2 の反省。`--window-size` は効かない）。

## CI（任意・後回し可）

GitHub Actions で `docker compose` を立てて `php artisan test` + `tsc` + `lint`。Phase 11（デプロイ）と一緒に整える。R3 の必須ではない。
