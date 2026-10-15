# データベース設計（PostgreSQL 16）（R4）

## ER 概要

```
categories 1─< products 1─< product_images
                      1─< product_variants
users(role) 1─< addresses
users       1─< orders 1─< order_items >─0..1 products
                     1─< order_items >─0..1 product_variants
orders      1─1 payment            (R3 追加。Stripe PaymentIntent の記録)
stripe_events   (R3 追加。Webhook 冪等性のための処理済みイベント台帳)
site_contents   (R3 追加。トップページの CMS コンテンツ)
```

性別区別なし・ユニセックス。サイズは `S` `M` `L`（アクセサリーは `FREE` 単一 variant）。

Laravel 標準テーブル（`users`, `password_reset_tokens`, `sessions`, `cache`, `jobs`, `failed_jobs`, `personal_access_tokens`）はそのまま利用。**R3 は `jobs` / `failed_jobs` を実際に使う**（キュー）。

---

## マイグレーションのファイル名順（R2 の反省）

Laravel はマイグレーションをファイル名の辞書順で流す。`create_product_images_table`（`_i`）は `create_products_table`（`_s`）より前にソートされ、FK 作成で落ちる。**タイムスタンプを手で調整**して依存順（親テーブル → 子テーブル）を保証する。R3 の順序:

```
0001_01_01_000000  create_users_table            (標準)
0001_01_01_000001  create_cache_table            (標準)
0001_01_01_000002  create_jobs_table             (標準。failed_jobs 含む)
...._000003  create_personal_access_tokens_table  (install:api)
...._000100  add_role_to_users_table
...._000110  create_categories_table
...._000120  create_products_table
...._000130  create_product_images_table
...._000140  create_product_variants_table
...._000150  create_addresses_table
...._000160  create_orders_table
...._000170  create_order_items_table
...._000180  create_payments_table
...._000190  create_stripe_events_table
...._000200  create_site_contents_table
```

---

## categories

| カラム | 型 | 制約 / 備考 |
|---|---|---|
| id | bigserial | PK |
| name | varchar(50) | `Tops` など |
| slug | varchar(50) | UNIQUE |
| position | integer | 表示順 |
| created_at / updated_at | timestamp | |

初期4件（`CategorySeeder`。position 順）: `tops` / `bottoms` / `outerwear` / `accessories`。
URL は `/collections/{slug}`（ルート自体は作らないが slug は保持）。

---

## products

| カラム | 型 | 制約 / 備考 |
|---|---|---|
| id | bigserial | PK |
| category_id | bigint | FK → categories、ON DELETE RESTRICT |
| name | varchar(120) | |
| slug | varchar(140) | UNIQUE |
| price | integer | JPY 税込。CHECK (price > 0) |
| description | text | 商品説明（段落） |
| material | text | 素材 |
| care | text | nullable。取扱い・洗濯表示 |
| origin | varchar(50) | 原産国 |
| product_code | varchar(30) | 品番（表示用、variant の sku とは別） |
| size_chart | jsonb | nullable |
| is_published | boolean | default true。false は公開一覧・詳細・API から除外 |
| position | integer | 一覧の並び順 |
| created_at / updated_at | timestamp | |

インデックス: `category_id`, `slug`, `(is_published, position)`

### size_chart JSON フォーマット

```json
{
  "unit": "cm",
  "columns": ["着丈", "身幅", "肩幅", "袖丈"],
  "rows": { "S": [66, 52, 46, 20], "M": [68, 55, 48, 21], "L": [70, 58, 50, 22] }
}
```

Bottoms の columns 例: `["ウエスト", "股上", "股下", "わたり幅", "裾幅"]`。Accessories は `size_chart = null`。

---

## product_images

| カラム | 型 | 制約 / 備考 |
|---|---|---|
| id | bigserial | PK |
| product_id | bigint | FK → products、ON DELETE CASCADE |
| path | varchar(255) | バケットのオブジェクトキー。例 `products/12/01J....jpg` |
| alt | varchar(255) | |
| position | integer | 0=主画像、1=一覧ホバー画像、以降ギャラリー順 |
| created_at / updated_at | timestamp | |

インデックス: `(product_id, position)`。API リソースが `url = /media/{path}` を組み立てて返す（`url` カラムは持たない）。

---

## product_variants

| カラム | 型 | 制約 / 備考 |
|---|---|---|
| id | bigserial | PK |
| product_id | bigint | FK → products、ON DELETE CASCADE |
| size | varchar(10) | `S` `M` `L` / `FREE` |
| color | varchar(30) | nullable |
| sku | varchar(40) | UNIQUE |
| stock | integer | CHECK (stock >= 0) |
| position | integer | サイズ表示順 |
| created_at / updated_at | timestamp | |

一意制約: NULL 複合 UNIQUE の罠（R2 の反省）を避けるため **2 本立て**:
- `UNIQUE(product_id, size, color)`（通常 UNIQUE。color NOT NULL の行に効く）
- 部分 UNIQUE インデックス `UNIQUE(product_id, size) WHERE color IS NULL`

### 在庫ステータス（API 算出、閾値は config）

| 条件 | value | セレクタ |
|---|---|---|
| `stock = 0` | `sold_out` | 選択不可・グレーアウト |
| `1 <= stock <= 5` | `low_stock` | 選択可・`LOW STOCK` |
| `stock >= 6` | `in_stock` | 選択可 |

`config('shop.low_stock_threshold')`（= 5）。公開 API は生の `stock` を返さない。

---

## users（Laravel 標準を拡張）

| カラム | 型 | 備考 |
|---|---|---|
| id | bigserial | PK |
| name | varchar(255) | 氏名 |
| email | varchar(255) | UNIQUE |
| password | varchar(255) | bcrypt |
| role | varchar(20) | `customer` / `admin`、default `customer` |
| remember_token | varchar(100) | |
| created_at / updated_at | timestamp | |

`email_verified_at` は無い（メール認証は実装しない。2026-09-14 撤去。`docs/rebuild-log.md`）。シーダーで管理者1人（`role = 'admin'`）。ダミー顧客は手動投入。

---

## addresses

R2 から不変。

| カラム | 型 | 制約 / 備考 |
|---|---|---|
| id | bigserial | PK |
| user_id | bigint | FK → users、ON DELETE CASCADE |
| recipient_name | varchar(100) | |
| postal_code | varchar(8) | `123-4567` |
| prefecture | varchar(10) | |
| city | varchar(100) | |
| address_line1 | varchar(255) | |
| address_line2 | varchar(255) | nullable |
| phone | varchar(20) | |
| is_default | boolean | default false。ユーザーごと最大1件 true（アプリ側で担保） |
| created_at / updated_at | timestamp | |

インデックス: `user_id`

---

## orders

| カラム | 型 | 制約 / 備考 |
|---|---|---|
| id | bigserial | PK |
| user_id | bigint | FK → users、ON DELETE RESTRICT |
| order_number | varchar(20) | UNIQUE。`EC-YYYYMMDD-NNNN`（日付内連番）。**日付は JST**（R4 修正。R3 は UTC の日付だったため、JST 0:00〜8:59 の注文が前日の番号になっていた） |
| status | varchar(20) | CHECK IN (`pending`,`paid`,`shipped`,`completed`,`cancelled`) |
| subtotal | integer | 明細合計 |
| shipping_fee | integer | 送料（¥800 または 0） |
| total | integer | subtotal + shipping_fee |
| paid_at | timestamp | nullable。決済成功時刻（R3 追加） |
| shipped_at | timestamp | nullable。発送時刻（R3 追加） |
| cancelled_at | timestamp | nullable。キャンセル時刻（R3 追加） |
| ship_recipient_name | varchar(100) | 配送先スナップショット |
| ship_postal_code | varchar(8) | |
| ship_prefecture | varchar(10) | |
| ship_city | varchar(100) | |
| ship_address_line1 | varchar(255) | |
| ship_address_line2 | varchar(255) | nullable |
| ship_phone | varchar(20) | |
| created_at / updated_at | timestamp | |

住所は注文時点の値をコピー保持。インデックス: `user_id`, `order_number`, `status`, **`(status, paid_at)`**（R4 追加。売上ダッシュボードの「売上対象ステータス × 期間」の集計用。`docs/05-admin.md`）

タイムゾーン: アプリ（`config/app.php`）も DB も **UTC で保存**する。日本時間が必要な所（注文番号の日付・売上ダッシュボードの日/月の区切り）だけ、計算時に `Asia/Tokyo` に変換する（R4 で明文化）。

### 注文ステータス state machine（R3）

```
          POST /api/orders
                │
                ▼
            ┌────────┐   payment_intent.succeeded (Webhook)   ┌──────┐
            │ pending │ ─────────────────────────────────────▶ │ paid │
            └────────┘                                         └──────┘
                │                                                  │ admin: 発送
                │ 決済失敗 / 放棄(TTL) / admin キャンセル              ▼
                │                                              ┌─────────┐
                │                                              │ shipped │
                ▼                                              └─────────┘
           ┌───────────┐                                            │ admin: 完了
           │ cancelled │ ◀── admin: paid からのキャンセル(返金)        ▼
           └───────────┘                                       ┌───────────┐
           （在庫を戻す）                                        │ completed │
                                                               └───────────┘
```

許可される遷移（`OrderStatus::canTransitionTo()`）:

| from → to | 実行者 | 副作用 |
|---|---|---|
| `pending → paid` | Stripe Webhook | `paid_at` セット、注文確認メール dispatch |
| `pending → cancelled` | Webhook（失敗/期限切れ）/ admin | `cancelled_at` セット、在庫復元 |
| `paid → shipped` | admin | `shipped_at` セット、発送通知メール dispatch |
| `paid → cancelled` | admin | `cancelled_at` セット、在庫復元、**Stripe 返金**（`docs/09`） |
| `shipped → completed` | admin | — |
| `shipped → cancelled` | admin | 返品扱い。**手動対応前提**。在庫は戻さない（`cancelled_at` のみ） |

それ以外の遷移は 422（`InvalidOrderTransitionException`）。

---

## order_items

R2 から不変。

| カラム | 型 | 制約 / 備考 |
|---|---|---|
| id | bigserial | PK |
| order_id | bigint | FK → orders、ON DELETE CASCADE |
| product_id | bigint | FK → products、ON DELETE SET NULL（nullable） |
| product_variant_id | bigint | FK → product_variants、ON DELETE SET NULL（nullable） |
| product_name | varchar(120) | スナップショット |
| variant_size | varchar(10) | スナップショット |
| variant_color | varchar(30) | nullable。スナップショット |
| image_url | varchar(255) | 主画像スナップショット。画像なしは空文字（NOT NULL） |
| unit_price | integer | 注文時単価 |
| quantity | integer | CHECK (quantity > 0) |
| line_total | integer | unit_price * quantity |
| created_at / updated_at | timestamp | |

---

## payments（R3 追加）

Stripe PaymentIntent を注文と 1:1 で記録する。

| カラム | 型 | 制約 / 備考 |
|---|---|---|
| id | bigserial | PK |
| order_id | bigint | FK → orders、ON DELETE CASCADE、UNIQUE |
| provider | varchar(20) | 固定 `stripe`（将来の拡張余地。今は1種） |
| stripe_payment_intent_id | varchar(255) | UNIQUE。`pi_...` |
| status | varchar(30) | `requires_payment_method` / `processing` / `succeeded` / `canceled` など Stripe の値をそのまま |
| amount | integer | PaymentIntent 作成時の金額（= orders.total。JPY なので最小単位＝円） |
| currency | varchar(3) | 固定 `jpy` |
| stripe_charge_id | varchar(255) | nullable。成功後に格納（返金用） |
| refunded_at | timestamp | nullable |
| last_error | varchar(255) | nullable。直近の決済失敗理由（表示用） |
| created_at / updated_at | timestamp | |

- PaymentIntent は注文ごとに1つ。再試行しても同じ `payment_intent_id` を使い回す（`docs/09`）。
- `amount` は監査用の記録。実際の請求額は Stripe 側が正。

---

## stripe_events（R3 追加）

Webhook の冪等性を DB で保証するための処理済みイベント台帳。

| カラム | 型 | 制約 / 備考 |
|---|---|---|
| id | bigserial | PK |
| stripe_event_id | varchar(255) | UNIQUE。`evt_...` |
| type | varchar(80) | `payment_intent.succeeded` など |
| processed_at | timestamp | 処理完了時刻 |
| created_at | timestamp | 受信時刻 |

Webhook 受信時にまず `stripe_event_id` を UNIQUE 制約付きで INSERT。既存なら「処理済み」として 200 を返し何もしない。

---

## site_contents（R3 追加。CMS）

トップページの編集可能コンテンツ。詳細は `docs/11-cms.md`。

| カラム | 型 | 制約 / 備考 |
|---|---|---|
| id | bigserial | PK |
| key | varchar(40) | UNIQUE。`hero` / `concept` / `lookbook` / `about` |
| data | jsonb | セクションごとのスキーマ（`docs/11`） |
| updated_by | bigint | nullable。FK → users（ON DELETE SET NULL）。最後に編集した admin |
| created_at / updated_at | timestamp | |

`SiteContentSeeder` で4キーを初期投入（R2 のプレースホルダ文言と同じ内容）。

---

## 注文作成トランザクション（`POST /api/orders`）

R2 とほぼ同じ。決済は**この後**の別ステップ。

1. カート明細（`variant_id` + `quantity` の配列）と `address`（既存 id or 新規オブジェクト）を受け取る
2. トランザクション開始
3. 対象 variant を `FOR UPDATE` でロックし、`stock >= quantity` を検証。不足あれば 422 で該当明細を返却しロールバック
   - **ロックは必ず `id` 昇順で取る**（`orderBy('id')->lockForUpdate()`。R4 修正）。順番が揃っていないと、A が [1, 2]・B が [2, 1] を同時に注文したときに互いのロックを待ち合うデッドロックになりうる
4. `is_published = false` の商品が含まれれば 422
5. `subtotal` を再計算（クライアント送信の金額は信用しない）、送料ルール適用
6. `order_number` 採番（`EC-{today}-{当日連番}`。`today` は `now('Asia/Tokyo')` の日付）
7. `orders`（`status = pending`）/ `order_items` を作成、各 variant の `stock` を減算
8. 新規住所かつ「保存」指定なら `addresses` にも作成
9. コミット、作成した order を返却

## 決済トランザクション（Webhook `payment_intent.succeeded`）

`docs/09-payments-stripe.md` に詳細。要点:

1. 署名検証 → `stripe_events` に event id を INSERT（重複なら即 200）
2. metadata の `order_id` で注文を取得。行ロック
3. `status !== 'pending'` なら no-op（冪等）
4. `payments.status = succeeded` / `orders.status = paid` / `orders.paid_at = now()` を更新
5. `SendOrderConfirmation` ジョブを dispatch
6. `stripe_events.processed_at` を更新、コミット、200
