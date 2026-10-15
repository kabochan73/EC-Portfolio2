# API 設計（Laravel 12）（R4）

- ベースパス `/api`
- レスポンスは JSON。一覧は `{ "data": [...] }`、単体は `{ "data": {...} }`
- 認証は Sanctum のパーソナルアクセストークン（`Authorization: Bearer <token>`）
- ブラウザは直接叩かない。Next.js のサーバー側からのみ呼ぶ（BFF）。**例外は `POST /api/stripe/webhook`**（Stripe から直接）
- バリデーションエラーは 422 `{ "message": "...", "errors": { "field": ["..."] } }`
- 金額はすべて整数（JPY 税込）

## 公開エンドポイント

### GET /api/health
`{ "status": "ok", "app": "...", "database": "ok", "time": "..." }`

### GET /api/categories
```json
{ "data": [ { "id": 1, "name": "Tops", "slug": "tops" }, ... ] }
```

### GET /api/products
クエリ: `category`（slug） / `new`（`true` で作成30日以内・新着順） / `limit`

`is_published = true` のみ。カード表示に必要な項目のみ。
```json
{ "data": [
  { "id": 10, "name": "Boxy Cotton T-Shirt", "slug": "boxy-cotton-t-shirt", "price": 12000,
    "category": { "name": "Tops", "slug": "tops" },
    "stock_status": "in_stock",
    "is_new": true,
    "images": [ { "url": "/media/products/10/01J8A.jpg", "alt": "...", "position": 0 }, ... ] }
] }
```

### GET /api/products/{slug}
詳細。未公開・存在しない slug は 404。
```json
{ "data": {
  "id": 10, "name": "...", "slug": "...", "price": 12000,
  "category": { "name": "Tops", "slug": "tops" },
  "description": "...", "material": "...", "care": "...", "origin": "中国", "product_code": "EC-TP0012",
  "size_chart": { "unit": "cm", "columns": [...], "rows": { "S": [...], "M": [...], "L": [...] } },
  "is_new": true,
  "images": [ { "url": "...", "alt": "...", "position": 0 }, ... ],
  "colors": ["Black", "Ecru"],
  "variants": [
    { "id": 55, "size": "S", "color": null, "stock_status": "in_stock", "stock_label": "在庫あり", "selectable": true },
    ...
  ],
  "related": [ /* 同カテゴリの他公開商品を position 順に全件、一覧と同じ要約形式 */ ]
} }
```
`stock_status` 閾値: `0`→`sold_out` / `1..5`→`low_stock` / `>=6`→`in_stock`（`config('shop.low_stock_threshold')` = 5）。

### GET /api/content （R3 追加。CMS）
トップページの編集可能コンテンツ。詳細スキーマは `docs/11-cms.md`。
```json
{ "data": {
  "hero": { "headline": "...", "tagline": "...", "image_url": "/media/content/hero/01J..jpg" },
  "concept": { "body": "..." },
  "lookbook": { "images": [ { "url": "/media/content/lookbook/01J..jpg", "alt": "..." }, ... ] },
  "about": { "blocks": [ { "label": "Since 2019", "heading": "...", "body": "...", "image_url": "..." }, ... ] }
} }
```
未設定キーはデフォルト値を埋めて返す（フロントが必ず全キー受け取れる）。

### GET /api/cart/validate （カート再検証）
body ではなくクエリ or POST。`variant_id` の配列を渡し、各 variant の現在価格・在庫ステータス・公開状態・商品名/画像を返す。`/cart` `/checkout` 表示時に使用。
```json
{ "data": [
  { "variant_id": 55, "available": true, "price": 12000, "stock_status": "low_stock",
    "max_quantity": 3, "product_name": "...", "product_slug": "...", "size": "M", "color": null,
    "image_url": "/media/..." }
] }
```
存在しない / 非公開 variant は `available: false`。

`max_quantity` = `min(stock, cart_max_quantity_per_line)`。**「公開 API は生の在庫数を返さない」方針の唯一の例外**で、在庫が上限（10）未満のときは正確な在庫数が分かる。数量セレクタの上限を実在庫に合わせ、「選べたのに注文時に在庫不足」を防ぐ買い物体験を優先した（R4 で明文化。2026-10-15 ユーザー判断）。

## 認証エンドポイント

### POST /api/register
body: `name`, `email`, `password`, `password_confirmation`
→ 201 `{ "data": { user }, "token": "<plain-text-token>" }`

### POST /api/login  （`throttle:login` = メール+IP で 5回/分）
body: `email`, `password` → 200 `{ "data": { user }, "token": "..." }` / 失敗 422

失敗時は「メールが無い」「パスワード違い」を区別しない（同じメッセージ）。**応答時間でも区別させない**ため、ユーザーが存在しない場合もダミーのハッシュに対して `Hash::check` を実行する（R4 修正。R3 はコメントでそう謳いながら、ユーザー不在時に `Hash::check` を飛ばしていた）。

### POST /api/logout （要認証）
現在のトークンを失効 → 204

### GET /api/me （要認証）
→ `{ "data": { id, name, email, role } }`

### PUT /api/me （要認証）
body: `name`, `email` → 更新後の user。

### PUT /api/me/password （要認証）
body: `current_password`, `password`, `password_confirmation` → 204

メール認証は実装しない（2026-09-14 撤去。ポートフォリオ用途のため、登録だけで購入まで進める。`docs/rebuild-log.md`）。

## パスワードリセット（R3 追加）

### POST /api/forgot-password  （`throttle:6,1`）
body: `email` → 常に 200 `{ "message": "..." }`（アカウント存在を漏らさない）。
存在すれば `ResetPasswordMail` を dispatch（リンクは frontend の `/reset-password?token=..&email=..`）。

### POST /api/reset-password  （`throttle:6,1`）
body: `token`, `email`, `password`, `password_confirmation`
→ 200 / 失敗 422（`token` 無効・期限切れ含む）。成功で全既存トークンを失効させるかは任意（R3 は失効させない＝シンプル優先）。

## 住所録（要認証、本人のもののみ）

| メソッド | パス | 備考 |
|---|---|---|
| GET | `/api/addresses` | 一覧（is_default を先頭） |
| POST | `/api/addresses` | 作成。`is_default=true` なら他を false 化 |
| PUT | `/api/addresses/{id}` | 更新 |
| DELETE | `/api/addresses/{id}` | 削除 |
| POST | `/api/addresses/{id}/default` | デフォルト設定 |

body: `recipient_name`, `postal_code`, `prefecture`, `city`, `address_line1`, `address_line2?`, `phone`, `is_default?`

## 注文（要認証）

### POST /api/orders  （要認証。メール認証は不要 — ポートフォリオ用途のため誰でも購入体験できるようにしている）
```json
{ "items": [ { "variant_id": 55, "quantity": 2 } ],
  "address_id": 3, "address": null, "save_address": false }
```
- `address_id` か `address`（新規）のどちらか必須
- 金額はサーバーで再計算。`status = pending` で作成、在庫引き当て
- → 201 `{ "data": { order } }`（order_items 含む、`status: "pending"`）
- 在庫不足 → 422 `{ "message": "...", "errors": { "items": [...] }, "shortages": [ { "variant_id": 55, "available": 1 } ] }`

### GET /api/orders （要認証）
本人の注文一覧（新しい順）。要約（number / created_at / item_count / total / status）。

### GET /api/orders/{order_number} （要認証）
本人の注文詳細。他人の注文は 404。`payment` の要約（status / last_error）を含む。

## 決済（R3 追加）

### POST /api/checkout/payment-intent  （要認証。メール認証は不要）
body: `{ "order_number": "EC-20260907-0001" }`
- 対象注文が本人・`pending` であることを検証（それ以外は 409）
- 金額をサーバーで再計算（`orders.total` と一致確認。ズレたら 409 = 注文が古い）
- `payments` 行が無ければ PaymentIntent を作成（`amount = total`, `currency = jpy`, `metadata.order_id`）。あれば既存を再利用（`client_secret` を取り直す）
- → 200 `{ "data": { "client_secret": "pi_..._secret_...", "publishable_key": "pk_test_..." } }`

### POST /api/stripe/webhook  （**認証なし**。署名検証のみ。Sanctum・CSRF 対象外）
- ヘッダ `Stripe-Signature` を `STRIPE_WEBHOOK_SECRET` で検証。失敗 → 400
- `stripe_events` に event id を INSERT（重複なら 200・no-op）
- 扱うイベント:
  - `payment_intent.succeeded` → 注文を `paid` に、注文確認メール dispatch
  - `payment_intent.payment_failed` → `payments.last_error` を更新（注文は `pending` のまま。ユーザーが再試行可能）
  - `payment_intent.canceled` → 注文を `cancelled` に、在庫復元
  - `charge.refunded` → `payments.refunded_at` を記録（admin キャンセル経由の返金の追認）
- 未対応イベントは 200 で受け流す
- → 常に 200（署名不正の 400 を除く）。処理失敗時は 500 を返して Stripe に再送させる

詳細・冪等性の実装は `docs/09-payments-stripe.md`。

## 管理 API（`/api/admin/*`、`auth:sanctum` + `admin`）

エンドポイント一覧は `docs/05-admin.md`。R3 追加分の要点:

- `PUT /api/admin/orders/{number}/status` … state machine 対応（`docs/02`）。不正遷移 422。`paid → cancelled` は Stripe 返金を伴う
- `GET /api/admin/content` / `PUT /api/admin/content/{key}` … CMS
- `POST /api/admin/content/{key}/images` … CMS 用画像アップロード（`content/{key}/{ulid}.ext`）
- `GET /api/admin/stats` … `revenue_total`（`paid` 以降の `total` 合計）を復活
- `GET /api/admin/sales` … **R4 追加**。売上ダッシュボード（KPI / 日別・月別 / カテゴリ別ランキング）。仕様は `docs/05-admin.md`

## Next.js 側の Route Handler（BFF）

| ブラウザ向け | 内部で呼ぶ Laravel |
|---|---|
| `POST /bff/login` `register` `logout` | `/api/login` 等。token を httpOnly Cookie に |
| `GET /bff/me` | `/api/me` |
| `POST /bff/forgot-password` `reset-password` | 同名 |
| `GET/POST/PUT/DELETE /bff/addresses...` | `/api/addresses...` |
| `POST/GET /bff/orders` `GET /bff/orders/{number}` | `/api/orders...` |
| `POST /bff/checkout/payment-intent` | `/api/checkout/payment-intent` |
| `GET /bff/cart/validate` | `/api/cart/validate` |
| 商品・カテゴリ・CMS 読み取り | Server Component から直接 `fetch(API_URL + ...)`（Cookie 不要、ISR タグ付き） |
| `/bff/admin/*` | 管理 API 中継。更新系は成功後に `revalidateTag()` |

**Stripe Webhook は BFF を通さない。** Stripe → `https://<backend 公開 path>/api/stripe/webhook` へ直接（`docs/04`）。

Cookie 名: `ecp_token` / `httpOnly` / `secure`（本番）/ `sameSite=lax` / `path=/` / 有効期限 30日
