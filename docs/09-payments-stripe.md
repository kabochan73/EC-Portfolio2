# Stripe 決済（R4）

## 方針

- **Stripe カード決済のみ**（test mode）。PaymentIntent + Payment Element。
- 決済フローは注文作成と**分離**する: `POST /api/orders`（`pending` 作成・在庫引き当て）→ `POST /api/checkout/payment-intent`（金額確定・PaymentIntent 作成）→ フロントで確定 → **Webhook が唯一の "支払い成立" の判断根拠**。
- フロントの `confirmPayment` 成功だけでは注文を `paid` にしない（クライアントは信用しない）。必ず Webhook `payment_intent.succeeded` で遷移。
- 通貨は JPY（ゼロ小数通貨）。`amount` は円をそのまま渡す（`1200` = ¥1,200）。

## なぜ注文を先に作るか

- 在庫の引き当てを決済前に確定させたい（決済画面に進んだ時点で在庫を押さえる。売り違いを減らす）。
- 決済失敗・離脱は `pending` のまま残り、ユーザーが `/account/orders/[number]` から再開できる。
- 放置された `pending` は **30分（`shop.pending_order_ttl_minutes`）で自動キャンセル**（`orders:expire-pending` をスケジューラが5分ごとに実行。在庫復元）。PaymentIntent は Stripe 側で自動的に期限切れにならないので、こちらから取り消す。
- 同じユーザーが新しい注文を作ると、そのユーザーの `pending` 注文はキャンセルされる（`CancelSupersededOrders`）。決済画面から戻って注文し直したときの在庫の二重確保を防ぎ、1ユーザーが確保できる在庫を最新の1注文分に抑える。`POST /api/orders` はユーザーごとに 5回/分。
- `pending → cancelled`（admin / 期限切れ / 置き換え）では **PaymentIntent を Stripe 側で取り消してから**キャンセルする。取り消さないと、キャンセル後にユーザーが支払いを完了できてしまう。決済が `succeeded` / `processing` なら取り消せないのでキャンセルしない（admin には 409。Webhook で paid になる）。
- それでもキャンセル済み注文に `payment_intent.succeeded` が届いたら、`MarkOrderPaid` が全額返金して記録する（安全網）。

## PaymentIntent ライフサイクル

```
POST /api/orders
      │  orders.status = pending, 在庫減算, payments 行なし
      ▼
POST /api/checkout/payment-intent  （何度呼んでもよい = 冪等）
      │  payments 行が無ければ Stripe に PaymentIntent 作成 → payments 作成
      │  あれば既存 pi を retrieve して client_secret を返す
      ▼
フロント: Payment Element で confirmPayment
      │
      ├─ 成功 → Stripe → Webhook: payment_intent.succeeded
      │            └─ MarkOrderPaid: orders.status = paid, paid_at, payments.status = succeeded,
      │                              payments.stripe_charge_id, SendOrderConfirmationJob dispatch
      │
      ├─ カード拒否 → confirmPayment が error を返す（Webhook: payment_intent.payment_failed）
      │            └─ HandlePaymentFailed: payments.last_error 更新（orders は pending のまま）
      │
      └─ ユーザー離脱 → pending のまま。30分後に orders:expire-pending が
                       PaymentIntent を取り消して cancelled + 在庫復元
```

admin が `paid → cancelled`:
```
TransitionOrderStatus(Cancelled)
  └─ StripeService::refund(payment_intent_id) → Stripe → Webhook: charge.refunded
        └─ RecordRefund: payments.refunded_at 記録（追認のみ。返金自体は同期で実行済み）
  └─ RestockOrder: 在庫復元
  └─ orders.status = cancelled, cancelled_at
```

## `POST /api/checkout/payment-intent` の詳細

`CreatePaymentIntent` Action:

1. `order_number` で注文取得。`$order->user_id === $request->user()->id` でなければ 404
2. `$order->status !== Pending` なら 409 `{ "message": "この注文はすでに処理されています", "status": "<現在値>" }`
3. 金額の再確認: `ShippingFeeCalculator` 等で `total` を再計算し `$order->total` と一致するか。ズレたら 409（カタログ価格が変わった → 注文を作り直させる。`PaymentAmountMismatchException`）
4. `STRIPE_SECRET_KEY` 未設定なら 503 `{ "message": "決済は現在利用できません" }`（ローカルでキー未入手のとき用）
5. `$order->payment` が無ければ:
   ```php
   $pi = $stripe->createPaymentIntent($order); // amount=total, currency=jpy,
                                               // metadata={order_id, order_number},
                                               // automatic_payment_methods={enabled:true}
   $order->payment()->create([
     'provider' => 'stripe',
     'stripe_payment_intent_id' => $pi->id,
     'status' => $pi->status,
     'amount' => $order->total,
     'currency' => 'jpy',
   ]);
   ```
6. あれば `$stripe->retrievePaymentIntent($payment->stripe_payment_intent_id)`。`status` が `canceled` なら新規作成し直す（稀）。それ以外はそのまま `client_secret` を返す
7. → 200 `{ "data": { "client_secret": $pi->client_secret, "publishable_key": config('services.stripe.publishable') } }`

## Webhook: 冪等性の実装

### `stripe_events` テーブルの使い方

R2 の rebuild-log 教訓（「INSERT 済みだが processed_at 未セットの再送を再処理したい」）を踏まえ、**2 段階**にする:

```php
// StripeEvent モデル
public static function claim(string $eventId, string $type): bool
{
    // 未処理として INSERT を試みる。既に processed_at が入っていれば false（スキップ）。
    // processed_at IS NULL の行が既にあれば true（前回失敗の再処理を許す）
    $row = static::firstOrCreate(
        ['stripe_event_id' => $eventId],
        ['type' => $type],
    );
    return $row->processed_at === null;
}

public static function complete(string $eventId): void
{
    static::where('stripe_event_id', $eventId)->update(['processed_at' => now()]);
}
```

コントローラ:
```php
if (! StripeEvent::claim($event->id, $event->type)) {
    return response('already processed', 200);
}
try {
    match ($event->type) { ... };
} catch (Throwable $e) {
    report($e);
    return response('processing error', 500); // Stripe が再送 → 次回 claim は true（processed_at まだ null）
}
StripeEvent::complete($event->id);
return response('ok', 200);
```

### 各 Action の冪等性（DB レベル）

- `MarkOrderPaid`: `lockForUpdate` して `status !== Pending` なら return（2回目の succeeded、または既にキャンセル済み）
- `HandlePaymentFailed`: `payments.last_error` を上書きするだけ（何度実行しても同じ）
- `CancelOrderPayment`: `status` が `pending` のときだけ `cancelled` + 在庫復元
- `RecordRefund`: `refunded_at` が null のときだけセット

### 署名検証

```php
// StripeService
public function constructWebhookEvent(string $payload, ?string $sigHeader): Event
{
    return Webhook::constructEvent($payload, $sigHeader ?? '', config('services.stripe.webhook_secret'));
}
```
`SignatureVerificationException` → コントローラで 400。**生のリクエストボディ**が必要（`$request->getContent()`。パース済みの配列ではダメ）。

### ルート登録（CSRF・Sanctum の外）

```php
// routes/api.php （api ミドルウェアグループ。web の CSRF は元々かからない）
Route::post('/stripe/webhook', StripeController::class)
    ->middleware('throttle:60,1')
    ->name('stripe.webhook');
```
`bootstrap/app.php` で `VerifyCsrfToken` の except は不要（api ルートなので）。`auth:sanctum` グループの外に置く。

## 金額・通貨の扱い

- `config('shop.currency')` = `jpy`。JPY はゼロ小数なので Stripe に渡す `amount` は円そのまま。
- `orders.total` / `payments.amount` = 円（integer）。
- 送料無料しきい値・送料は `ShippingFeeCalculator`（Domain）で、注文作成時と PaymentIntent 作成時の両方で使う（同じ計算に収束するはず。ズレたら 409）。

## テスト（`docs/12` と対）

`StripeService` をモックしてネットワークを遮断:

```php
it('marks order paid on payment_intent.succeeded webhook', function () {
    $order = Order::factory()->pending()->withPayment()->create();
    $payload = fixture_event('payment_intent.succeeded', [
        'metadata' => ['order_id' => $order->id],
        'latest_charge' => 'ch_test_123',
    ]);
    $this->mock(StripeService::class)
        ->shouldReceive('constructWebhookEvent')->andReturn(Event::constructFrom($payload));

    $this->postJson('/api/stripe/webhook', $payload, ['Stripe-Signature' => 't=1,v1=x'])
        ->assertOk();

    expect($order->fresh()->status)->toBe(OrderStatus::Paid);
    Queue::assertPushed(SendOrderConfirmationJob::class);
});

it('is idempotent for duplicate webhook delivery', function () { /* 同じ event id で2回 POST → paid は1回、メール1回 */ });
it('rejects webhook with bad signature', fn () => /* constructWebhookEvent が throw → 400 */);
it('returns 409 when creating payment-intent for a non-pending order', ...);
it('ignores confirmPayment success on the client — status stays pending until webhook', ...);
```

## セキュリティ・運用メモ

- `client_secret` はそのオーダーの決済にしか使えない（Stripe の仕様）。ログに出さない。
- Webhook エンドポイントは公開だが署名必須。`STRIPE_WEBHOOK_SECRET` が本番と `stripe listen` で異なる点に注意（`docs/07`）。
- 返金は全額のみ（部分返金は R3 スコープ外）。
- Stripe ダッシュボードのイベントログが一次情報。DB とズレたら Stripe が正。
- PCI: カード番号はフロントの Stripe Element と Stripe サーバーの間だけ。自サーバー・自 DB を通らない（SAQ A 相当）。
