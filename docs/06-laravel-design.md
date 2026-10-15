# Laravel 設計指針（R4）

「綺麗な Laravel」= 設計論を発明することではなく、**フレームワークが用意したレイヤーを正しく使い分け、ビジネスロジックを1箇所に集める**こと。DDD・ヘキサゴナル・CQRS は持ち込まない。R2 の指針を土台に、R3 の追加要素（決済・キュー・メール・state machine）をどのレイヤーに置くかを定義する。

---

## 0. 2大アンチパターン

| アンチパターン | 症状 | 対策 |
|---|---|---|
| Fat Controller | コントローラに在庫チェック・金額計算・トランザクション | ロジックを Action に。コントローラは 5〜10 行 |
| 過剰な抽象化 | 差し替え予定のない Interface、全テーブルに Repository、神 Service | 「差し替える予定がある」「同じロジックが3箇所」のときだけ抽象化 |

**判断基準は R3 でも同じ**: 差し替え予定があるか、同じロジックが3箇所に出たときだけ抽象化する。

---

## 1. レイヤー構成

| レイヤー | 置き場所 | 責務 |
|---|---|---|
| Route | `routes/api.php`（公開 + 認証必須）/ `routes/admin.php`（管理 API。api.php から prefix('admin') + admin ミドルウェアで読み込む） | URL とコントローラの対応、ミドルウェア |
| Controller | `app/Http/Controllers/Api/{Shop,Auth,Account,Order,Webhook,Admin}/` | 入力を受け取り Action を呼び Resource を返す |
| FormRequest | `app/Http/Requests` | 形式的バリデーション + 認可 |
| Action | `app/Actions` | ビジネスロジック1ユースケース。トランザクション境界 |
| Domain クラス | `app/Domain` | Eloquent 非依存の純粋ロジック（送料計算・採番） |
| Model | `app/Models` | リレーション・スコープ・キャスト |
| Enum | `app/Enums` | 状態・区分の定義と振る舞い（**state machine もここ**） |
| API Resource | `app/Http/Resources/{Shop,Order,Account,Admin}/` | レスポンス JSON 整形。公開用と管理用は Admin/ で分ける |
| Exception | `app/Exceptions` | ドメインエラー → HTTP 変換（`render()`） |
| Job | `app/Jobs` | **キューに載る非同期処理（R3 追加）**。メール送信など |
| Mailable | `app/Mail` | メール1通の定義（`docs/10`） |
| Service | `app/Services` | **外部システムの凝集したラッパーのみ**。`StorageService` / `StripeService` |

データの流れ（R2 と同じ）:
```
Request → Route → Controller
  → FormRequest（バリデーション・認可）
  → Action::execute(DTO)
      → Domain クラス（純粋ロジック）
      → Model（クエリ・永続化）
      → dispatch(Job)（非同期。R3）
      → throw DomainException（異常系）
  → API Resource → JSON Response
```

---

## 2. Action と Service の使い分け（R3 更新）

- **デフォルトは Action**。1 ユースケース 1 クラス、`execute()` のみ。動詞で命名。
- **Service は外部システムの凝集したラッパーのみ**:
  - `StorageService` … S3 互換バケット操作（put / delete / キー生成）
  - `StripeService` … Stripe API のラッパー（PaymentIntent 作成・取得・返金、Webhook 署名検証）。SDK を直接コントローラや Action に散らさず、この1クラスに閉じる
- **Action が Action を呼ぶのは1段まで**。共通ロジックは Domain クラスへ。
- **単純な読み取りに Action を作らない**。コントローラ直書き、育ったら `Query` クラス。

### R3 で作る Action（R2 の 11 個 + 追加）

| ドメイン | Action |
|---|---|
| Order | `CreateOrder`（`pending` 作成・在庫引き当て）/ `RestockOrder`（キャンセル時の在庫戻し。Domain 寄りだが DB 更新を伴うので Action）|
| Payment | `CreatePaymentIntent`（注文から PaymentIntent 作成 or 再利用）/ `MarkOrderPaid`（Webhook succeeded の本体）/ `HandlePaymentFailed` / `CancelOrderPayment`（Webhook canceled）|
| Admin/Order | `TransitionOrderStatus`（state machine の唯一の入口。paid→shipped / shipped→completed / *→cancelled）|
| Auth | `RegisterUser` / `AuthenticateUser` / `UpdateProfile` / `UpdatePassword` |
| Address | `CreateAddress` / `UpdateAddress` / `DeleteAddress` / `SetDefaultAddress` |
| Admin/Product | `CreateProduct` / `UpdateProduct` / `DeleteProduct` |
| Admin/ProductImage | `CreateProductImage` / `DeleteProductImage` / `ReorderProductImages` |
| Admin/Variant | `CreateVariant` / `UpdateVariant` / `DeleteVariant` |
| Admin/Category | `CreateCategory` / `UpdateCategory` / `DeleteCategory` / `ReorderCategories` |
| Admin/Content | `UpdateSiteContent`（CMS。`data` 差し替え + `updated_by`）|

メール送信そのものは Action ではなく **Job**（`SendOrderConfirmationJob` 等）に置き、Action / Webhook ハンドラから `dispatch()` する。

---

## 3. 決済まわりの設計（`docs/09` と対）

### StripeService（Service を使う正当な理由）

```php
final class StripeService
{
    public function __construct(private readonly StripeClient $stripe) {}

    public function createPaymentIntent(Order $order): PaymentIntent { ... }
    public function retrievePaymentIntent(string $id): PaymentIntent { ... }
    public function refund(string $paymentIntentId): Refund { ... }
    public function constructWebhookEvent(string $payload, string $sigHeader): Event { ... }
}
```

- SDK（`stripe/stripe-php`）の `StripeClient` を DI（`AppServiceProvider` でシークレットキーを注入）
- メソッド群が同じ依存（`StripeClient`）を共有し、無限には増えない → Service の条件に合致
- テストでは `StripeService` をモック（`$this->mock(StripeService::class)`）してネットワークを避ける

### Webhook ハンドラ（Controller は薄く）

```php
// App\Http\Controllers\Api\Webhook\StripeController
class StripeController extends Controller
{
    public function __invoke(Request $request, StripeService $stripe): Response
    {
        try {
            $event = $stripe->constructWebhookEvent($request->getContent(), $request->header('Stripe-Signature'));
        } catch (SignatureVerificationException) {
            return response('invalid signature', 400);
        }

        // 冪等: stripe_events に claim。既に処理済みなら即 200
        if (! StripeEvent::claim($event->id, $event->type)) {
            return response('already processed', 200);
        }

        match ($event->type) {
            'payment_intent.succeeded'      => app(MarkOrderPaid::class)->execute($event),
            'payment_intent.payment_failed' => app(HandlePaymentFailed::class)->execute($event),
            'payment_intent.canceled'       => app(CancelOrderPayment::class)->execute($event),
            'charge.refunded'               => app(RecordRefund::class)->execute($event),
            default                         => null, // 未対応は受け流す
        };

        StripeEvent::complete($event->id);
        return response('ok', 200);
    }
}
```

- ルート: `Route::post('/stripe/webhook', StripeController::class)->middleware('throttle:60,1')`。`auth:sanctum` の外。CSRF は API なので元々なし
- 各 Action（`MarkOrderPaid` 等）が `DB::transaction` + `lockForUpdate` を持つ
- 処理中に例外 → 500 を返して Stripe に再送させる。`claim()` は `firstOrCreate` で行を作り `processed_at === null` なら true を返す（前回失敗の行はまだ null なので再処理できる）。`complete()` が `processed_at` をセットする。`docs/09` に整理

### MarkOrderPaid（Webhook succeeded の本体）

```php
final class MarkOrderPaid
{
    public function execute(Event $event): void
    {
        $intent = $event->data->object; // PaymentIntent
        DB::transaction(function () use ($intent) {
            $order = Order::whereKey($intent->metadata->order_id)->lockForUpdate()->firstOrFail();
            if ($order->status !== OrderStatus::Pending) {
                return; // 冪等: 既に paid / cancelled なら何もしない
            }
            $order->payment->update([
                'status' => 'succeeded',
                'stripe_charge_id' => $intent->latest_charge,
            ]);
            $order->update(['status' => OrderStatus::Paid, 'paid_at' => now()]);
            SendOrderConfirmationJob::dispatch($order->id);
        });
    }
}
```

### 金額はクライアントもフロントの「注文」も信じすぎない

- PaymentIntent の `amount` は `orders.total`（サーバーが `CreateOrder` で確定した値）から取る
- `CreatePaymentIntent` は「注文が `pending` か」「`total` が今計算しても同じか」を確認。ズレたら 409（カタログ価格が変わった等 → 注文を作り直させる）

---

## 4. 注文ステータス state machine（Enum に振る舞い）

```php
enum OrderStatus: string
{
    case Pending = 'pending';
    case Paid = 'paid';
    case Shipped = 'shipped';
    case Completed = 'completed';
    case Cancelled = 'cancelled';

    /** 許可される次状態 */
    public function transitions(): array
    {
        return match ($this) {
            self::Pending   => [self::Paid, self::Cancelled],
            self::Paid      => [self::Shipped, self::Cancelled],
            self::Shipped   => [self::Completed, self::Cancelled],
            self::Completed, self::Cancelled => [],
        };
    }

    public function canTransitionTo(self $to): bool
    {
        return in_array($to, $this->transitions(), true);
    }

    public function isTerminal(): bool
    {
        return $this->transitions() === [];
    }
}
```

- 遷移の**副作用**（在庫戻し・返金・メール）は Enum ではなく `TransitionOrderStatus` Action が持つ（Enum は「遷移が許されるか」の判定のみ）
- `TransitionOrderStatus::execute(Order $order, OrderStatus $to, User $actor)`:
  1. `$order->status->canTransitionTo($to)` でなければ `throw new InvalidOrderTransitionException`
  2. `DB::transaction` で `lockForUpdate`
  3. `$to` に応じた副作用: `Cancelled` かつ `from` が pending/paid → `RestockOrder`。`from === Paid && $to === Cancelled` → `StripeService::refund`。`$to === Shipped` → `shipped_at` + `SendOrderShippedJob`
  4. `$order->update(['status' => $to, ...timestamps])`

---

## 5. キュー（R3 追加。R2 の「入れない」を見直し）

- `QUEUE_CONNECTION=database`（`jobs` テーブル）。Redis は入れない（規模的に不要、Railway サービスを1つ増やすだけで済む）
- **キューに載せるもの**: メール送信のみ（4 種）。Webhook の本体処理は同期（Stripe が 200 を待つ間に完了させたい／メールだけ後回し）
- Job は薄く: `SendOrderConfirmationJob($orderId)` → `handle()` で `Order::with(...)->find($id)` して `Mail::to(...)->send(new OrderConfirmationMail($order))`。ID を渡してモデルは handle 内で引く（シリアライズ肥大を避ける。`SerializesModels` でも可だが ID 明示のほうが意図が明確）
- `--tries=3`、失敗は `failed_jobs`。`failed()` フックでログ（メールなので握りつぶしてよい。注文自体は成立している）
- ローカル: compose の `queue` サービスが `php artisan queue:work`。テスト: `Queue::fake()` / `Mail::fake()`

---

## 6. パスワードリセット（Laravel 標準を薄く使う）

- **メール認証機能は実装しない**（2026-09-14・R3 調整）。ポートフォリオ用途で、誰でもアカウント登録だけで購入まで一通り体験できるようにするため、`verified` ミドルウェア・検証メール送信・`/verify-email` 系エンドポイントを全て撤去した（`User` は `MustVerifyEmail` を実装しない、`email_verified_at` 列も無い）。撤去に至る過程は `docs/rebuild-log.md` 参照
- パスワードリセットは `Password` broker をそのまま。`password_reset_tokens` テーブル利用。リセット URL は **frontend のパス**を指す（`SendPasswordResetJob` が `FRONTEND_URL . '/reset-password?...'` を自前で組み立てる。Laravel の `ResetPassword::createUrlUsing()` は使っていない）

---

## 7. Eloquent / Model（R2 と同じ）

- スコープでクエリに言葉を: `scopePublished` / `scopeInCategory` / `scopeForUser`
- グローバル eager load はしない。必要な箇所で `->with([...])`
- `AppServiceProvider::boot()` で `Model::preventLazyLoading(! app()->isProduction())`
  - **R2 の発見**: `preventLazyLoading` は複数行結果にしか効かない。単一モデルの遅延アクセスはすり抜ける。詳細ページの `with` は手を抜かない
- キャスト: `status => OrderStatus::class` / `size_chart => 'array'` / `data => 'array'`（site_contents）/ `paid_at => 'datetime'` など

---

## 8. config に集約（`config/shop.php`。R2 と同じ + R3）

```php
return [
    'low_stock_threshold' => 5,
    'new_product_days' => 30,
    'shipping_fee' => 800,
    'free_shipping_threshold' => 20000,
    'cart_max_quantity_per_line' => 10,
    'order_number_prefix' => 'EC',
    'currency' => 'jpy',
];
```
Stripe / Resend のキーは `config/services.php`。

---

## 9. ディレクトリ構成

```
app/
├── Actions/
│   ├── Order/            CreateOrder(+Input) RestockOrder
│   ├── Payment/          CreatePaymentIntent MarkOrderPaid HandlePaymentFailed CancelOrderPayment RecordRefund
│   ├── Admin/            Order/TransitionOrderStatus  Content/UpdateSiteContent  Product/... Category/... Variant/... ProductImage/...
│   ├── Auth/             RegisterUser AuthenticateUser UpdateProfile UpdatePassword
│   └── Address/          CreateAddress UpdateAddress DeleteAddress SetDefaultAddress
├── Domain/
│   └── Order/            ShippingFeeCalculator  OrderNumberGenerator
├── Enums/                OrderStatus  StockStatus  UserRole
├── Jobs/                 SendPasswordResetJob(通常は broker 任せ)  SendOrderConfirmationJob  SendOrderShippedJob
├── Mail/                 ResetPasswordMail  OrderConfirmationMail  OrderShippedMail
├── Http/
│   ├── Controllers/Api/   Shop/  Auth/  Account/  Order/(OrderController CheckoutController)  Webhook/StripeController  Admin/
│   ├── Middleware/        EnsureAdmin
│   ├── Requests/          Auth/  Address/  Order/  Checkout/  Admin/{Category,Product,ProductImage,Variant,Order,Content}/
│   └── Resources/         Shop/  Order/(OrderResource OrderListResource OrderItemResource)  Account/  Admin/
├── Exceptions/           InsufficientStockException  UnpublishedProductException  CategoryInUseException
│                         InvalidOrderTransitionException  PaymentAmountMismatchException
│                         OrderNotPendingException
├── Models/               ... Payment  StripeEvent  SiteContent
└── Services/             StorageService  StripeService
```

---

## 10. 命名規約（R2 と同じ）

| 対象 | 規約 | 例 |
|---|---|---|
| Action | 動詞 + 名詞、`execute()` | `CreatePaymentIntent` `TransitionOrderStatus` |
| Action の入力 DTO | `{Action名}Input` | `CreateOrderInput` |
| Job | `{動詞}{名詞}Job` | `SendOrderConfirmationJob` |
| Mailable | `{名詞}Mail` | `OrderConfirmationMail` |
| FormRequest | `{動詞}{モデル}Request` | `StoreOrderRequest` |
| Resource | `{モデル}Resource` | `OrderResource` |
| Enum | 単数名詞 | `OrderStatus` |
| Exception | `{事象}Exception` | `InvalidOrderTransitionException` |

---

## 11. バリデーションの層分担（R2 と同じ）

| 層 | 何を | 例 |
|---|---|---|
| FormRequest | 形式・型・必須・所有権（DB 単発 exists） | `quantity` は 1〜10、`address_id` は本人のもの |
| Action | 業務ルール・競合が絡む検証 | `lockForUpdate` 後の在庫、`is_published`、金額再計算、**state machine 遷移可否** |
| DB 制約 | 最終防衛線 | `stock >= 0` CHECK、`sku` UNIQUE、`orders_status_check`、FK |

書き込み系（POST/PUT/PATCH/DELETE で body を取る）は rules が1行でも FormRequest に分ける。読み取り系の GET クエリはインライン `$request->validate()`。

---

## 12. テスト戦略（`docs/12-testing.md` に詳細）

- **Pest 3**（R2 は phpunit のまま未記述だった）。Feature 中心、Unit は純粋ロジック（`ShippingFeeCalculator` / `StockStatus::fromStock` / `OrderStatus::canTransitionTo` / `OrderNumberGenerator`）
- **機能実装と並行して書く**（R2 の最大の反省）。Step ごとに対応するテストを足してからコミット
- 決済は `StripeService` をモック。Webhook は署名済みペイロードを組み立てて `postJson`
- `Mail::fake()` / `Queue::fake()` で dispatch を検証
- 実 DB（Postgres）で回す。`RefreshDatabase`

---

## 13. やらないことリスト（R2 + R3）

| 誘惑 | R3 の判断 | 理由 |
|---|---|---|
| Repository パターン | 使わない | Eloquent が Repository |
| 神 `OrderService` / `PaymentService` に全メソッド | Action に分割。Service は SDK ラッパーのみ | 神クラス化 |
| Interface + 実装1つ（`PaymentGatewayInterface` 等） | 作らない | Stripe を差し替える予定がない。必要になってからで遅くない |
| Webhook 処理を全部キューに | 同期でやる | Stripe が待つ 200 の間に注文確定まで済ませたい。メールだけ非同期 |
| イベント / リスナーで疎結合化 | Action 直呼び | この規模では追いにくくなるだけ |
| Redis | 入れない（`docs/00` で検討済み） | カタログキャッシュは Next の ISR に寄せた。レートリミッタ・キューは `database` で足りる。実負荷が出たら再検討 |
