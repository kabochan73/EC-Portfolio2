# 管理者ページ設計（R4）

方式: **Next.js に自作の `/admin`**（フロントと同じ技術・デザイン）。Laravel には管理用 API `/api/admin/*`。

## 認可

- `users.role`（`customer` / `admin`、default `customer`）。シーダーで管理者1人
- `GET /api/me` は `role` を返す（メール認証は実装しないため `email_verified` は無い。2026-09-14）
- Next.js: `middleware.ts` で `/admin/*` を Cookie 有無だけチェック。実 role 確認は Server Component の `requireAdmin()`（`role !== 'admin'` なら `/` へ）
- Laravel: `/api/admin/*` は `auth:sanctum` + `admin` ミドルウェア（`EnsureAdmin`、`$user->role === UserRole::Admin`）。認証済みだが権限なしは 403
- ログインは通常の `/login` を共用

## 画面（Next.js ルート）

| パス | 内容 |
|---|---|
| `/admin` | ダッシュボード（注文件数・pending 件数・在庫僅少/切れの商品数・最近の注文5件）+ **売上ダッシュボード（R4 追加）**。下の「売上ダッシュボード」節 |
| `/admin/products` | 商品一覧（未公開含む、検索・カテゴリ絞り込み・ページング） |
| `/admin/products/new` | 商品新規作成 |
| `/admin/products/[id]` | 商品編集（基本情報／画像／バリアント／公開フラグ） |
| `/admin/categories` | カテゴリ一覧・追加・編集・並べ替え |
| `/admin/orders` | 注文一覧（ステータスフィルタ・ページング） |
| `/admin/orders/[number]` | 注文詳細・ステータス変更（フルフィルメント） |
| `/admin/customers` | 会員一覧（閲覧のみ、注文数・登録日、名前/メール検索） |
| `/admin/content` | **CMS（R3 追加）**。トップの Hero / Concept / Lookbook / About を編集 |

管理画面はモノトーンだが装飾を排し、機能優先のテーブル/フォームレイアウト。ストアフロントの Header/Footer は持たず、専用サイドバー（Dashboard / Products / Categories / Orders / Customers / Content / My Account）。

### 商品編集ページ

1. **基本情報**: name / slug / category / price / description / material / care / origin / product_code / size_chart（列名＋各サイズの数値をカンマ区切りテキストで編集する簡易版。R2 の判断を踏襲）/ is_published / position
2. **画像**: アップロード（multipart）、サムネ一覧、並べ替え（position）、削除。position 0 = 主画像・1 = ホバー画像。保存系操作後に BFF が `revalidateTag('products')` と `revalidateTag('product:{slug}')`
3. **バリアント**: S/M/L（アクセサリーは FREE）の行。color（任意）/ sku / stock。size は新規作成時のみ選択可、編集時は読み取り専用

### 注文詳細ページ（R3 でフルフィルメント対応）

- 配送先スナップショット / 明細 / 送料 / 合計 / 注文日時 / 顧客（name / email）
- 決済情報: `payment.status` / `stripe_payment_intent_id`（表示のみ）/ `last_error`
- ステータス操作（現在値に応じてボタンを出し分け。`docs/02` の state machine）:
  - `pending`: `CANCEL ORDER`（在庫復元）
  - `paid`: `MARK AS SHIPPED` / `CANCEL & REFUND`（在庫復元 + Stripe 返金）
  - `shipped`: `MARK AS COMPLETED` / `CANCEL`（返品扱い、在庫は戻さない）
  - `completed` / `cancelled`: 操作なし
- 不正遷移は API が 422。フロントはボタンで既に絞っているが、二重送信対策として楽観ロックはせず「操作後に再取得」

### CMS 編集ページ（`/admin/content`。R3 追加）

`docs/11-cms.md` に詳細。4 セクションをタブ or アコーディオンで:
- **Hero**: headline / tagline（テキスト）+ 背景画像（1枚アップロード）
- **Concept**: body（複数行テキスト）
- **Lookbook**: 画像リスト（追加・削除・並べ替え。5〜6枚想定）
- **About**: ブロックの配列（label / heading / body / 画像1枚）。3ブロック想定

保存 = `PUT /api/admin/content/{key}`（画像は先に `POST /api/admin/content/{key}/images` でアップロードして URL を得てから）。成功後 BFF が `revalidateTag('content')`。

### 売上ダッシュボード（`/admin`。R4 追加）

R3 は「売上を表示しない」方針だったが、2026-10-15 に撤回。EC の管理画面らしさと、集計クエリ（日付の区切り・前月比）を設計する題材として追加する。

**集計ルール（全パーツ共通）**

- 売上に含める注文: `status IN (paid, shipped, completed)`。`pending`（未決済）と `cancelled` は除外
- 売上の日付: **`orders.paid_at`**（決済が成立した時刻。注文作成時刻ではない）
- 日付の区切りは**日本時間（Asia/Tokyo）**。DB は UTC で保存しているので、集計時に JST に変換してから日・月で区切る
- 金額は税込・送料込みの `orders.total`（ランキングのみ商品単位なので `order_items.line_total`）

**画面構成**

1. **KPI（上部 3 枚）**: 今月の売上 / 今月の注文数 / 今日の売上
2. **棒グラフ（全体売上のみ）**: 初期表示は「今月の日別」（1 日〜月末、未来の日は 0）。切り替えで「月別（過去 12 か月、今月を含む）」。先月との重ね表示はしない
3. **カテゴリ別 商品ランキング**: カテゴリごとに、その**カテゴリの全商品**を今月の**販売個数順**に並べる（TOP N で切らない。同数なら売上金額の多い順）。期間は今月のみ。各商品に**前月比**
   - 前月比 = 今月の販売個数 ÷ **先月 1 か月分すべて**の販売個数（並び順と同じ「個数」で比べる）。月の途中でも先月全体と比べる（月初は低く出ることを承知の上での仕様）
   - 先月の販売個数が 0 の商品は前月比を出さない（`null` → 画面では「—」）
   - 今月売上 0 の商品も並べる（全商品表示のため）。削除済み商品（`order_items.product_id` が NULL）は対象外

## Laravel 管理 API（`/api/admin`、要 admin）

### ダッシュボード
| メソッド | パス | 返却 |
|---|---|---|
| GET | `/api/admin/stats` | `{ orders_count, revenue_total, pending_count, low_stock_count, sold_out_count, recent_orders: [...] }`。`revenue_total` = `status IN (paid, shipped, completed)` の `total` 合計 |
| GET | `/api/admin/sales` | **R4 追加**。売上ダッシュボード一式（下記）。日別・月別の両方を 1 回で返し、グラフの切り替えはフロントだけで行う（データは最大 31 + 12 点と小さいので再取得しない） |

`GET /api/admin/sales` のレスポンス:

```json
{
  "kpi": { "month_revenue": 128000, "month_orders": 9, "today_revenue": 15800 },
  "daily":   [{ "date": "2026-10-01", "revenue": 0 }, ...],
  "monthly": [{ "month": "2025-11", "revenue": 0 }, ...],
  "ranking": [
    {
      "category": { "id": 1, "name": "Tops" },
      "products": [
        { "id": 3, "name": "...", "quantity": 2, "revenue": 31600, "last_month_quantity": 1, "mom_ratio": 2.0 }
      ]
    }
  ]
}
```

- 日付・月はすべて JST。`daily` は今月の 1 日〜月末を欠けなく返す（売上の無い日も `0` で埋める）。`monthly` も同様に 12 か月分
- `mom_ratio` = 個数の前月比（先月 0 個なら `null`）
- グラフ描画ライブラリは入れない（2026-10-15 決定）。棒グラフは div の高さ（`revenue ÷ 期間内の最大値` の %）で自作する。ホバーで金額を出す程度にとどめ、軸の目盛りは最大値と 0 のみ
- 集計ロジックは `Actions/Admin/GetSalesDashboard`（`docs/06` の Action）に置き、日付計算は Unit テスト、集計は Feature テストで確認する

### 商品
| メソッド | パス | 備考 |
|---|---|---|
| GET | `/api/admin/products` | 未公開含む。`?q=&category=&page=` |
| POST | `/api/admin/products` | 作成 |
| GET | `/api/admin/products/{id}` | 編集用フル情報（images/variants 込み） |
| PUT | `/api/admin/products/{id}` | 基本情報更新 |
| DELETE | `/api/admin/products/{id}` | 削除（`order_items.product_id` は SET NULL） |

### 商品画像
| メソッド | パス | 備考 |
|---|---|---|
| POST | `/api/admin/products/{id}/images` | multipart。バケット保存 + 行作成 |
| PUT | `/api/admin/products/{id}/images/reorder` | `{ order: [imageId, ...] }` |
| DELETE | `/api/admin/product-images/{id}` | バケットのオブジェクトも削除 |

### バリアント
| メソッド | パス | 備考 |
|---|---|---|
| POST | `/api/admin/products/{id}/variants` | `{ size, color?, sku, stock }` |
| PUT | `/api/admin/variants/{id}` | `{ color?, sku, stock }`（size 変更不可） |
| DELETE | `/api/admin/variants/{id}` | 注文で参照済みは SET NULL |

### カテゴリ
| メソッド | パス |
|---|---|
| GET / POST | `/api/admin/categories` |
| PUT / DELETE | `/api/admin/categories/{id}` |
| PUT | `/api/admin/categories/reorder` |

`DELETE` は所属商品がある場合 409（`CategoryInUseException`。DB の RESTRICT に頼らず事前チェック）。

### 注文
| メソッド | パス | 備考 |
|---|---|---|
| GET | `/api/admin/orders` | 全ユーザー。`?status=&page=` |
| GET | `/api/admin/orders/{order_number}` | 明細・配送先・顧客・決済情報 |
| PUT | `/api/admin/orders/{order_number}/status` | `{ status }`。state machine（`docs/02`）。不正遷移 422。`paid → cancelled` は返金 |

### 会員
| メソッド | パス | 備考 |
|---|---|---|
| GET | `/api/admin/customers` | `role='customer'`。注文数・登録日。`?q=`（name/email 部分一致）・`?page=` |

### CMS（R3 追加）
| メソッド | パス | 備考 |
|---|---|---|
| GET | `/api/admin/content` | 全 4 キーの `data`（生 JSON） |
| PUT | `/api/admin/content/{key}` | `data` を差し替え。`updated_by` に現在の admin |
| POST | `/api/admin/content/{key}/images` | multipart。`content/{key}/{ulid}.ext` で保存、`{ url }` を返す |

## 画像ストレージ（Railway バケット）

R2 から不変。
- Railway バケットは private のみ。直リンク不可
- Laravel は Flysystem S3 ドライバ（`config/filesystems.php` の `s3` ディスク）
- キー形式: 商品 `products/{product_id}/{ulid}.{ext}` / CMS `content/{key}/{ulid}.{ext}`
- `product_images.path` はキーを保持。`url` は API リソースが `/media/{path}` として組み立て
- 配信: Next.js `app/media/[...key]/route.ts` が `GetObject` して `Cache-Control: public, max-age=31536000, immutable` で返す
- ローカルは RustFS（`FILESYSTEM_DISK=s3`、エンドポイントを RustFS に、`AWS_USE_PATH_STYLE_ENDPOINT=true`）
- `Services/StorageService`（S3 互換バケットの薄いラッパ。`docs/06` で Service を使う数少ない箇所）
