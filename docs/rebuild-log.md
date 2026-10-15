# 作り直しログ（R4）

## R4 — 2026-10-15 開始

### 方針

- R3（`../../EC-Portfolio/`）と同じスコープ・同じ技術スタックを、自分の手で 1 から書き直す。目的は自分の理解
- 作る順番は R3 と同じ: 環境構築 → バックエンド（DB → カタログ → 認証 → 注文/決済 → 管理/CMS）→ フロントエンド → テスト/CI → デプロイ
- 設計 docs は R3 からコピーし、R4 の差分だけ書き足した
- R3 からの機能追加: 売上ダッシュボード（`docs/05-admin.md`）
- 期限: 2026-10-22 頃（来週）。できるだけ早く終わらせる

### R3 のバックエンドレビューで見つけた修正（R4 で最初から直す）

| # | 問題（R3） | R4 での対応 | docs |
|---|---|---|---|
| 1 | 注文番号の日付が UTC（JST 0:00〜8:59 の注文が前日の番号になる） | `now('Asia/Tokyo')` で日付を作る | 02 |
| 2 | ログインでユーザー不在時に `Hash::check` を飛ばす（応答時間の差でメール登録有無が推測できる。コメントと実装が不一致） | 不在時もダミーハッシュで `Hash::check` | 03 |
| 3 | 注文作成の在庫ロック順が不定（デッドロックの可能性） | `orderBy('id')->lockForUpdate()` | 02 |
| 4 | 売上集計用のインデックスが無い | `orders(status, paid_at)` を追加 | 02 |
| 5 | FK にインデックスが無い（PostgreSQL は自動で張らない）。docs には `products.category_id` ありと書いてあった | `products.category_id` / `order_items.order_id` に追加 | 02 |
| 6 | `config/admin.php` の `env('ADMIN_EMAIL', 既定値)` は `.env` に空で書いてあると空文字になり既定値に落ちない | `env('ADMIN_EMAIL') ?: 既定値` | — |

### 残タスク（やるかは後で判断）

- Stripe API 呼び出し（返金など）が DB トランザクション内にある。返金成功後に DB がロールバックすると状態がずれる（`charge.refunded` Webhook で追認されるので致命的ではない）→ 返金に idempotency key を付ける
- `POST /api/orders` で「未決済注文のキャンセル」と「新規作成」が別トランザクション。二重送信で pending が 2 件残りうる（30 分で自動キャンセルされるので実害小）
- 注文番号の同時採番で UNIQUE 違反 → 500。再試行していない（流量的に許容）

## 実装ログ

### Phase 0 — 設計ドキュメント（2026-10-15）

- R3 の `docs/` をコピー（`rebuild-log.md` を除く）。各見出しを R4 に変更
- `00-overview.md`: R4 のゴールを追加
- `05-admin.md` / `03-api.md`: 「売上は表示しない」を撤回し、売上ダッシュボードの仕様と `GET /api/admin/sales` を追加。ランキングは販売個数順（前月比も個数）、グラフはライブラリなしで自作
- `08-frontend-design.md` / `00-overview.md`: TanStack Query の使用箇所を R3 の実装に合わせて修正。`/admin` は全部 CSR に統一せず「読み取り = Server Component、操作 = Client Component」を維持（理由は 08 §3.4）
- `02-database-design.md` / `03-api.md`: R3 バックエンドレビューの修正 1〜4 を反映（上の表）
- 決定: コードは Claude が書き、ユーザーがレビュー（1 コミット 5 ファイル前後）。Railway デプロイは最後（R3 本番は比較用に残す）

## 環境構築フェーズ（Step 1〜6）

**Step 1 — 2026-10-15 リポジトリ骨組み**
- `git init`（`main`）。docs をコミット（`64b616b`）→ `.gitignore` / `.editorconfig` / `.nvmrc`（R3 と同じ）+ R4 用 `README.md`（`ca7f169`）

**Step 2 — 2026-10-15 ローカルインフラ（db / rustfs / mailpit）**
- `docker-compose.yml`: `db`（postgres:16-alpine、`ecp`）/ `rustfs` + `createbuckets`（`ec-portfolio-media` を private で自動作成）/ `mailpit`。コンテナ・ボリューム名は `ecp4-*`
- `backend/database/init/01-create-test-db.sql`（テスト DB `ecp_test`）を R3 の Step 6 から前倒し。DB の初回起動時にしか実行されないため最初から置く
- backend / frontend / queue / scheduler は Step 3 以降で段階的に追加

**Step 3 — 2026-10-15 backend（Laravel 12）+ Postgres 疎通**
- `composer create-project laravel/laravel:^12`（使い捨て `composer:2` コンテナ）→ `backend/`（v12.70.0）
- `php artisan install:api` で Sanctum。`User` に `HasApiTokens`
- コミットを「コマンドの生成物」と「手で書いた部分」に分割（生成物は読まなくてよいので例外的に 1 コミット）
- `docker-compose.yml` に `backend`（`serversideup/php:8.4-fpm-nginx`、`./backend` マウント、8000→8080）。`.env` は env_file で注入せずアプリに読ませる（テスト DB が上書きされない）
- `backend/.env.example` は R3 と同じ（Stripe / BFF / 管理者は空のプレースホルダ。使う Step で埋める）
- `GET /api/health`（DB 接続チェック込み）
- 確認: `curl localhost:8000/api/health` → `status ok` / `database ok`、`install:api` の migrate が Postgres に成功、pint パス

**Step 4 — 2026-10-15 frontend（Next.js 15）+ 確定ライブラリ**
- `create-next-app@15`（使い捨て `node:22-alpine`、`--skip-install`）→ `frontend/`（Next 15.5.28 / React 19.1、App Router、TS、Tailwind v4、no src dir、turbopack、eslint）
- 確定ライブラリ: zustand / @tanstack/react-query / react-hook-form + @hookform/resolvers + zod(3 系) / @aws-sdk/client-s3 / lucide-react / @stripe/stripe-js(9 系) / @stripe/react-stripe-js(6 系)。**Stripe は R3 と同じメジャーに固定**（最新は 10 / 7 系だが、R3 と見比べながら書くため）。テスト系（Vitest 等）はテストを書く Step で入れる
- `frontend/Dockerfile.dev`（起動時 `npm install && npm run dev`）/ compose に `frontend`（`node_modules` と `.next` は名前付きボリュームに隔離、polling 有効）
- `package.json` に `engines: node >=22 <23`、`next.config.ts` に `output: 'standalone'`
- 雛形の `.gitignore` が `.env*` で `.env.example` まで除外していたので `!.env.example` を追加
- ホスト側にも `npm ci`（IDE 補完用）
- 確認: `curl localhost:3000` → 200、コンテナ内 `tsc --noEmit` / `lint` パス

**Step 5 — 2026-10-15 queue worker / scheduler**
- compose に `queue`（`queue:work --tries=3 --sleep=3 --max-time=3600`）と `scheduler`（`schedule:work`）。どちらも backend と同イメージ・同コードで `command` だけ差し替え
- serversideup の既定 healthcheck は web サーバーを見るので `pgrep` に差し替え
- R3 では scheduler は後から追加したが、R4 は最初から入れる（定期実行の中身は注文の Step で書く）
- 確認: 2 つとも healthy。`Artisan::queue('inspire')` で積んだジョブを queue が処理（DONE、jobs 0 件・failed 0 件）
  - tinker から積んだクロージャのジョブは「eval されたコードはシリアライズできない」ため失敗する。queue の不具合ではない（確認方法の問題）

**Step 6 — 2026-10-15 Pest 導入 + BFF 疎通**
- 6a backend: `pestphp/pest`（3.8）+ `pest-plugin-laravel`（3.2）。`tests/Pest.php`（Feature に `RefreshDatabase`、Unit は TestCase のみ）
- **テストは実 Postgres（`ecp_test`）で回す**（sqlite では partial unique index / jsonb / CHECK を再現できない。R2 の反省）。`phpunit.xml` を pgsql・`ecp_test` に
- `tests/Feature/Health/HealthTest.php`。Example テスト 2 本は削除（`tests/Unit/.gitkeep` でディレクトリを残す。phpunit.xml の Unit スイートが参照するため）
- 6b frontend: `lib/api.ts`（`apiFetch` / `ApiError` / `apiErrorResponse`、サーバー専用）は **R3 の最終版**を採用（Step 6 時点の版は `cache: 'no-store'` を常に付けていて、後で ISR タグと衝突するバグがあった）。`app/bff/health/route.ts`（上流エラー 502）
- 確認: `php artisan test` → 1 passed（`ecp_test` に migrations 4 件 = テスト DB で実行）、`curl localhost:3000/bff/health` → `database ok`、backend を止めると 502、`tsc` / `lint` / `pint` パス

### 環境構築フェーズ 完了（Step 1〜6）
`docker compose up -d` だけで「ブラウザ → Next.js → Laravel → PostgreSQL」＋ RustFS / Mailpit / queue / scheduler が動く。次から機能実装（DB マイグレーション → 公開カタログ API…）。

## 機能実装フェーズ（バックエンド）

### Phase 2 — DB / モデル / 公開カタログ API（Step 7〜12）

**Step 7 — 2026-10-15 DB マイグレーション + Enums + config**（4 コミットに分割）
- 7a カタログ: users（Laravel 生成ファイルを直接修正。`email_verified_at` を作らず `role` を追加。R3 の add / drop の 2 本を 1 本に）/ categories / products / product_images / product_variants（NULL 複合 UNIQUE の罠を部分 UNIQUE 2 本立てで回避）
- 7b 注文: addresses / orders（`(status, paid_at)` で status 単独を置き換え）/ order_items（`order_id` インデックス追加）/ payments / stripe_events
- 7c site_contents + Enums（`UserRole` / `StockStatus` / `OrderStatus`）+ `products.category_id` インデックス
- 7d config: `shop.php`（送料・閾値などの定数）/ `admin.php`（`?:` で空文字にも既定値）/ `services.php`（stripe・bff）/ `app.php`（`frontend_url`）
- マイグレーションのファイル名は依存順に手動で `2026_10_15_1000xx` に揃える
- 確認: `migrate:fresh` 全 16 本成功。部分 UNIQUE で色なし同サイズの 2 行目が拒否、`orders_status_check` で不正 status が拒否、CHECK 4 本・追加インデックスを psql で確認

**Step 8 — 2026-10-15 Models + Factories + Seeders + Enum の Unit テスト**（6 コミットに分割。R3 は 29 ファイル 1 コミットで多すぎた）
- 8a/8b Model 11 種（リレーション・スコープ・キャスト）。`User` の `sendPasswordResetNotification`（未作成のジョブを使う）はパスワードリセットの Step まで外す
- 8c/8d Factory 10 種。R4 変更: `UserFactory` から `email_verified_at` を削除、`OrderFactory` の注文番号を JST・`completed()` state を追加（売上集計テスト用）
  - テスト時の注意: `ProductVariantFactory` はサイズがランダム（同一商品に複数作るなら `sequence` / `size()` で明示）、`OrderFactory` の `total` と明細金額は独立、`SiteContentFactory` は `key()` 指定必須
- 8e Seeder: Admin / Category(4) / SiteContent(4) / Product（**16 商品・57 バリアント**。R3 の rebuild-log の「14・48」は後で増えた最終版）。2 回流しても件数不変（冪等）
- 8f `AppServiceProvider` に `preventLazyLoading` / `preventSilentlyDiscardingAttributes`（非本番）。Stripe・レート制限はその機能の Step で足す
- Unit: `StockStatusTest`（境界。閾値 5）、`OrderStatusTransitionTest` は **R4 で 25 通り全組み合わせを検証する形に変更**（R3 は禁止遷移を手で列挙していて漏れに気づけない）
- 確認: `migrate:fresh --seed` 成功、`php artisan test` 31 passed、tinker で遅延ロード時に `LazyLoadingViolationException` を確認

**Step 9 — 2026-10-15 公開カテゴリ API**
- `GET /api/categories` … `Category::ordered()->get()` を `Shop\CategoryResource`（`{id,name,slug}` のみ）
- 経路: `routes/api.php` → `Api\Shop\CategoryController@index` → `Shop\CategoryResource`。管理用は `Admin` 名前空間に別 Controller / Resource を作る
- Feature テスト 3 本（position 順 / 露出項目 / 空リスト）
- 確認: `curl localhost:8000/api/categories` で Seeder の 4 件が position 順、`php artisan test` 34 passed

**Step 10 — 2026-10-15 公開商品一覧 API**
- `GET /api/products` … `published()` のみ・position 順。`?category`（slug、exists 検証）/ `?new`（`Request::boolean` で `true/1/yes` を許容、新着順・30日以内）/ `?limit`（1〜100）
- `ProductSummaryResource`（カード用項目のみ・生の在庫数は返さず全 variant 合算の `stock_status`）、`ProductImageResource`
- `ProductController` は `index()` のみ（`show()` は Step 11）
- 詰まり（R3）: `?new=true` を `boolean` ルールで検証すると文字列 `"true"` が 422 → `$request->boolean('new')` に
- Feature テスト 7 本
- 確認: `?category=accessories&limit=2` で 2 件、`?new=true` 200、`?category=nope` 422、`php artisan test` 41 passed
