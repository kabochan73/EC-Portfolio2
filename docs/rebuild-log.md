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

- ~~Stripe API 呼び出し（返金など）が DB トランザクション内にある。返金成功後に DB がロールバックすると状態がずれる → 返金に idempotency key を付ける~~ → **Step 21 で対応済み**
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
- 決定: バリデーションは R3 と同じ層分担（書き込み系 = FormRequest、GET クエリ = インライン `$request->validate()`。`docs/06` §11）を維持

**Step 11 — 2026-10-15 公開商品詳細 API**
- `GET /api/products/{slug}` … `published()` のみ、未公開・不明 slug は 404（403 にすると存在が漏れる）
- `ProductDetailResource`（description/material/care/origin/product_code/size_chart/images/colors/variants/related）。`colors` は色付き variant の重複除去。`related` は同カテゴリの他の公開商品を position 順に全件（`setRelation('relatedProducts', ...)` で差し込む）
- `ProductVariantResource` は公開用（`stock_status`/`stock_label`/`selectable`、生 stock は出さない）
- Feature テスト 7 本
- 確認: `ribbed-wool-beanie` で colors 3 色・在庫あり/残りわずか/SOLD OUT（selectable false）・related 3 件・size_chart null、不明 slug 404、`php artisan test` 48 passed

**Step 12 — 2026-10-15 カート再検証 API**
- `GET /api/cart/validate` … `?variant_ids[]` の配列を受け取り、各 variant の現在価格・`stock_status`・`max_quantity`（`min(stock, cart_max_quantity_per_line)`）・商品情報・主画像 URL を返す。存在しない/非公開商品の variant は `{ variant_id, available:false }`。リクエスト順を保持
- 決定（ユーザー判断）: `max_quantity` は在庫 10 未満だと実在庫が分かるが、R3 のまま許容。「生の在庫数を返さない」方針の唯一の例外として `docs/03` に明記（買い物体験を優先）
- Feature テスト 7 本
- 確認: 在庫 12 → max 10（上限で頭打ち）、売り切れ → max 0、存在しない id → available false、順番保持、`php artisan test` 55 passed

### Phase 2 完了
公開カタログ API（categories / products 一覧・詳細 / cart-validate）が揃った。`php artisan test` 55 passed。次は Phase 3（認証 / 会員 / 住所 / パスワードリセット）。

### Phase 3 — 認証 / 会員 / 住所 / パスワードリセット（Step 13〜16。メール認証は作らない）

**Step 13 — 2026-10-15 認証コア（register / login / logout / me）+ BFF 実 IP**（3 コミット）
- 13a `RegisterUser`（role は Customer 固定）/ `AuthenticateUser` / `RegisterRequest` / `LoginRequest` / `UserResource`
  - **R4 修正 #2**: ユーザー不在時もダミーハッシュ（cost 12）で `Hash::check`。tinker 実測でパスワード違い 289ms / 未登録 267ms（R3 は未登録だと照合を飛ばして即返っていた）
- 13b `AuthController`（register 201 / login 200 は `{ data, token }`、logout 204 は現トークンのみ削除）/ `ProfileController@show` / `throttle:login`（メール小文字 + IP で 5 回/分）・`throttle:register`（IP で 5 回/分）/ `sanctum.expiration` 30 日（null だと永久に有効）
- 13c `ResolveBffClientIp`（グローバル middleware。`X-BFF-Secret` が一致したときだけ `X-Client-IP` を `REMOTE_ADDR` に）。テストは R3 の forgot-password 版から register 版に書き換え（パスワードリセットは Step 16）
- Feature テスト 14 本（Auth 12 + BFF IP 2）
- 確認: curl で register → me → logout 204 → me 401、`php artisan test` 69 passed
- 注意: zsh では `H='-H a -H b'; curl $H` が分割されず nginx 400 になる（確認方法の問題）

**Step 14 — 2026-10-15 プロフィール更新（PUT /me, /me/password）**（2 コミット）
- 14a `UpdateProfile`（氏名・メール。R3 の「メール変更で認証やり直し」は撤去済みなので無し）/ `UpdatePassword`（変更した端末のトークンだけ残し、他は失効）/ `UpdateProfileRequest`（`unique->ignore(self)`）/ `UpdatePasswordRequest`（`current_password` + `different:current_password` + `Password::min(8)`）
- 14b `ProfileController@update` / `updatePassword`、ルート、Feature テスト 9 本
- 確認: curl で同じ管理者に 2 端末ログイン → A でパスワード変更 204 → A は 200・B は 401、新パスワードでログイン可。`php artisan test` 78 passed

**Step 15 — 2026-10-15 住所録 CRUD**（2 コミット）
- `/api/addresses` の index / store / update / destroy / setDefault。ルートは **`Route::apiResource('addresses', ...)->except(['show'])` + setDefault だけ個別**（R4 でユーザー提案。R3 は 5 本を手書き。PATCH も受けるようになる）。Request も **`AddressRequest` 1 つに統合**（R3 の Store / Update はクラス名以外まったく同じだった。ルールが分かれたら分ける）。他人の address id は 404 で存在を秘匿。`postal_code` は `123-4567` 形式
- **R4 変更（ユーザー判断 A）**: 「default はユーザーごとに 1 件」を部分 UNIQUE `addresses_one_default_per_user ON (user_id) WHERE is_default` で DB でも保証。`CreateAddress` / `UpdateAddress` を「先に他を false → 対象を true」の順に入れ替え（R3 は逆順で、このインデックスがあると違反する）
- default 削除時は残りの直近 1 件を昇格、既存 default を `is_default=false` 指定では外さない（常に 1 件）
- Feature テスト 10 本（R3 の 9 本 + DB が 2 件目の default を拒否する 1 本）
  - 詰まり: RefreshDatabase のトランザクション内で制約違反を起こすと、PostgreSQL は以降の SQL を全部拒否（`25P02 current transaction is aborted`）→ 失敗させる部分だけ `DB::transaction`（セーブポイント）で包む
- 確認: tinker で作成 / default 指定 / 更新で昇格 / setDefault / default 削除のどの後も ★ は 1 件、Factory で直接 2 件目を入れると DB が拒否。`php artisan test` 88 passed

**Step 16 — 2026-10-15 パスワードリセット**（2 コミット）
- 16a Laravel `Password` broker を使い、通知だけ自前に差し替え（`User::sendPasswordResetNotification` → `SendPasswordResetJob`（payload は user_id と token のみ）→ `ResetPasswordMail`（Markdown））。**Mailable + Job（キュー）の初導入**
  - キューのコードを変えたら `docker compose restart queue`（worker は起動時のコードを掴み続ける。R3 で踏んだ）
  - メールのヘッダーが標準のまま（`EC-PORTFOLIO: http://localhost:8000`）→ Step 21d で直した
- 16b `PasswordResetController`。`sendLink` は常に 200・中立メッセージ（アカウント存在を秘匿）。`reset` は `Password::reset`、成功で全トークン失効、失敗は 422 の `email` エラー。`throttle:password-reset`（IP で 6 回/分）。リンクはフロントの `/reset-password?token=&email=`、60 分有効
- Feature テスト 9 本
- E2E（scratchpad の bash スクリプト）: forgot は登録あり/なしで同じ応答・Mailpit 1 通 → メールのトークンで reset 成功 → 同じトークン再利用 422 → リセット前のログイントークン 401 → 新パスワードでログイン 200。`php artisan test` 97 passed
  - 確認方法の罠: zsh の `echo` は JSON 中の `\uXXXX` を解釈して落ちる / macOS の bash 3.2 は空配列 + `set -u` でエラー

### Phase 3 完了
認証コア / BFF 実 IP / プロフィール / 住所録 / パスワードリセットが揃った。`php artisan test` 97 passed。次は Phase 4（注文 + Stripe 決済）。

### Phase 4 — 注文 + Stripe 決済（Step 17〜22）

R3 の Step 18〜23 + R3 末期の穴埋め（未決済注文の自動キャンセル・置き換え・遅延入金の返金）をまとめて作る。

**Step 17 — 2026-10-15 注文の Domain ロジック + 例外**
- `ShippingFeeCalculator`（`>= 20000` で 0、それ以外 800、config 参照、Eloquent 非依存）
- `OrderNumberGenerator`（`EC-YYYYMMDD-NNNN`、当日の最大連番 + 1、衝突時は次の番号を最大 20 回試す、UNIQUE 制約が最終防衛線）
  - **R4 修正 #1**: 日付を `now('Asia/Tokyo')` に。R3 の「max を取った後に in_array でも確認する」重複ロジックも整理
- `InsufficientStockException` / `UnpublishedProductException`（`render()` で 422 + 原因の variant / product）
- Unit テスト 7 本（送料の境界、採番の初回/連番/日跨ぎ/**JST 08:30 = UTC 前日**/飛び番）。テストの時刻は `travelToJst()` で JST 指定
- 確認: 一時的に `now()`（UTC）へ戻すと日跨ぎ・JST の 2 本が落ちる = テストが R3 のバグを捕まえられることを確認。`php artisan test` 104 passed

**Step 18 — 2026-10-15 注文作成 API（POST /api/orders）**（3 コミット）
- 18a DTO 3 種（`CreateOrderInput` / `CartLineInput` / `ShippingAddressInput`）+ `StoreOrderRequest`（`items.*.variant_id` は `distinct`、`address_id` は `Rule::exists->where(user_id)`、`address` とどちらか必須）
- 18b `CreateOrder`: トランザクションで variant を `lockForUpdate` → 在庫検証 → 未公開検証 → subtotal をサーバー再計算（**クライアント送信の金額は無視**）→ `orders`(pending) + `order_items`（スナップショット）→ 在庫減算 → `save_address` なら住所録へ
  - **R4 修正 #3**: `orderBy('id')->lockForUpdate()`（デッドロック回避）。tinker の SQL ログで `order by "id" asc for update` を確認
  - **R4 変更**: 住所の保存は `CreateAddress` に委譲（R3 は「初回なら default」を重複実装）。内側の `DB::transaction` は外側に合流するので、注文失敗時は住所も巻き戻る
  - `OrderResource` / `OrderItemResource`（`whenLoaded` で一覧・詳細を共用、画像なしの空文字は null で返す）
- 18c `OrderController@store`、`throttle:orders`（ユーザーごとに 5 回/分）。メール認証は不要。未決済注文の置き換え（CancelSupersededOrders）は Stripe 連携が要るので Step 22
- Feature テスト 10 本
- 確認: 在庫不足（999 個）で例外 → 注文 0 件増・在庫そのまま（全部ロールバック）。`php artisan test` 114 passed

**Step 19 — 2026-10-15 注文取得 API**
- `GET /api/orders` … `forUser` + `withSum('items as items_quantity_total','quantity')` + `recentFirst`、`OrderListResource`（`item_count` は quantity 合計）
- `GET /api/orders/{order}` … 本人のみ、他人・不明は 404、`items.product:id,slug` + `payment` を eager load
- **R4 変更**: ルートを `Route::apiResource('orders', ...)->only(['index','store','show'])->middlewareFor('store','throttle:orders')` に。show は文字列の注文番号で検索する代わりに **ルートモデルバインディング**（`getRouteKeyName()` = `order_number`）+ 本人チェック（住所録と同じ形）。throttle が store だけに付くことを `gatherMiddleware()` で確認
- Feature テスト 6 本。`php artisan test` 120 passed

**Step 20 — 2026-10-15 StripeService + PaymentIntent 作成 API**（3 コミット）
- 20a `stripe/stripe-php`（v21.3.2）。`StripeService`（`StripeClient` ラッパー：`createPaymentIntent` / `retrievePaymentIntent` / `cancelPaymentIntent` / `refund` / `constructWebhookEvent`）。`AppServiceProvider::register` で `StripeClient` を DI（キー未設定でも構築は通す＝空文字ではなく `[]`）。`phpunit.xml` に STRIPE ダミーキー
- 20b `CreatePaymentIntent`: キー未設定 503 → **注文を `lockForUpdate` で読み直し** → 非 pending 409 → 現在のカタログ価格で total 再計算し一致確認（ズレ 409）→ payments 無ければ作成・あれば retrieve（`canceled` なら作り直し）
  - **R4 追加**: 行ロックで二重作成を防ぐ（R3 はダブルクリック等で Stripe に PI が 2 つでき、payments の UNIQUE 違反で 500 になりえた）。偽の StripeService（作成に 2 秒）で 2 プロセス同時に呼び、1 つ目が作成・2 つ目は待って再利用・payments 1 行を確認
- 20c `POST /api/checkout/payment-intent`（auth、他人の注文 404）。テストは `StripeService` をモック
- Feature テスト 7 本。`php artisan test` 127 passed

**Step 21 — 2026-10-15 Stripe Webhook + 注文確定 + 注文確認メール**（3 コミット + 見た目）
- 21a `POST /api/stripe/webhook`（**認証なし・署名検証のみ・Sanctum の外**、`throttle:60,1`）。backend の唯一の公開エンドポイント。署名不正 400、`StripeEvent::claim` で冪等（重複 200 no-op、前回失敗の `processed_at` null は再処理可）、処理失敗は 500 で Stripe に再送させる。failed / canceled / refunded は Step 22
  - `MarkOrderPaid`: `order_id` で `lockForUpdate`、`pending` 以外は no-op、payment=succeeded + charge_id、order=paid + paid_at。キャンセル済み注文への入金は自動で全額返金（安全網）
  - **R4 変更**: 確認メールのジョブは `->afterCommit()`（キューを Redis 等に替えても paid 前に送られない）
  - **R4 変更（残タスク ④ 解決）**: `StripeService::refund()` に `idempotency_key = refund-{PI}`。DB ロールバックでやり直しになっても二重返金しない
- 21b `SendOrderConfirmationJob`（payload は order_id のみ）/ `OrderConfirmationMail`（Markdown、明細テーブル、`/account/orders/{番号}` へのリンク）
- 21c `tests/Support/StripeFixtures`（疑似イベント生成）、Feature テスト 7 本 + Unit `StripeServiceTest`（返金に idempotency key が付く。キーを外すと落ちることを確認）
- 確認: 不正署名 400 / tinker で MarkOrderPaid → paid・ジョブ 1 件、同じイベント 2 回目でもジョブは増えない / Mailpit に注文確認メール。`php artisan test` 135 passed
- 21d メールの見た目: `resources/views/vendor/mail/html/themes/default.css` を R3 のモノトーン版に（4 色のみ・影なし）。`vendor/mail/{html,text}/message.blade.php` を上書きし、ヘッダーのリンクを `app.url`（backend）→ `app.frontend_url` に（**R3 は backend の URL のままだった**。BFF 構成では backend はブラウザから見えない）。Mailpit でヘッダーが `http://localhost:3000`・背景 `#f4f4f4` を確認

**Step 22 — 2026-10-16 支払いの失敗・キャンセル・返金 + 未決済注文の自動キャンセル**（3 コミット）
- 22a `RestockOrder` / `TransitionOrderStatus`（state machine の唯一の入口。`execute` は管理操作用、`cancelIfPending` はロック後もまだ pending のときだけキャンセル = 期限切れ・置き換え用）/ `PaymentInProgressException`(409) / `InvalidOrderTransitionException`(422)
  - **R4 修正**: `RestockOrder` も variant を id 昇順でまとめてロック（R3 は明細順に 1 行ずつ。CreateOrder と同時に走るとデッドロックがありえた）
  - **R4 変更**: `cancelPaymentIntent` は `payments.status` が既に `canceled` なら Stripe に問い合わせない。発送通知メール（paid→shipped）は管理画面の Step で足す
- 22b `HandlePaymentFailed`（`last_error` を記録、注文は pending のまま）/ `CancelOrderPayment` / `RecordRefund`（`refunded_at` が null のときだけ）を Webhook に接続
  - **R4 変更**: `CancelOrderPayment` は R3 の「在庫戻し + cancelled」重複実装をやめ `TransitionOrderStatus::cancelIfPending` に委譲
  - 自分のミス: 最初の版は注文の状態を見る前に payments を canceled に書き換えていて、遅れて届いた canceled で paid 注文の決済記録が壊れた。R3 のテストは決済記録を見ていなかったのですり抜けた → 注文をロックして pending のときだけ書き換える形に直し、テストに「paid なら payments も succeeded のまま」を追加（誤った版で落ちることを確認）
- 22c `CancelSupersededOrders`（新しい注文の前に同じユーザーの pending をキャンセル）を `OrderController@store` に、`orders:expire-pending`（30 分超の pending をキャンセル・PI 取り消し・在庫戻し。決済処理中は残す）+ `routes/console.php`（5 分ごと、`sanctum:prune-expired` 毎日）
- Feature テスト 4 + 6 本。tinker で ① PI 有効 → retrieve+cancel ② PI 取消済み → Stripe 呼ばない ③ paid→cancelled → refund 1 回・在庫戻し ④ cancelled→pending は例外、を確認。`schedule:list` に 2 件。`php artisan test` 145 passed

### Phase 4 完了
注文作成 → PaymentIntent → Webhook（成功 / 失敗 / キャンセル / 返金）→ 確認メール、未決済注文の自動キャンセル・置き換えまで揃った。`php artisan test` 145 passed。次は Phase 5（管理 API + CMS + 売上ダッシュボード API）。

### Phase 5 — 管理 API + CMS + 売上ダッシュボード API（Step 23〜30）

**Step 23 — 2026-10-16 管理 API の土台 + カテゴリ管理**（3 コミット）
- 23a `EnsureAdmin`（`role != admin` は 403）を `bootstrap/app.php` で `admin` エイリアスに。`routes/admin.php` に分離し、`api.php` で `auth:sanctum` + `admin` + `prefix('admin')` + **`name('admin.')`**（apiResource の名前が利用者側の `orders.index` 等と衝突しないように。R4 追加）
  - **R4 追加**: `AdminRoutesTest` … `/api/admin/*` の全ルートが `auth:sanctum` と `admin` を通ることを構造で検証。group から admin を外すと落ちることを確認
- 23b `Admin/Category` の Create/Update/Delete/Reorder Action、`CategoryInUseException`（所属商品ありの削除 409。DB の RESTRICT に頼らず事前チェック）
- 23c `Admin/CategoryController`、`Admin/CategoryResource`（position + products_count）。ルートは `PUT /categories/reorder` を先に、残りは `apiResource('categories')->except(['show'])`
  - **R4 変更**: Store / Update の Request を `CategoryRequest` 1 つに（違いは slug unique の ignore だけ。作成時は `ignore(null)` で何も除外しない）
  - **R4 変更**: テスト用 `admin()` ヘルパーを `tests/Pest.php` に移動（R3 は CategoryAdminTest に定義し、他の管理テストが暗黙に依存していた）
- Feature テスト 1 + 9 本。`php artisan test` 155 passed

**Step 24 — 2026-10-16 商品管理 CRUD（基本情報）**
- `Admin/Product` の Create（position は末尾）/ Update / Delete Action、`Admin/ProductListResource`（未公開含む要約 + `total_stock` / `variant_count`、`withSum` / `withCount` 前提で null は 0）、`Admin/ProductResource`（編集フォーム用の生値 + images / variants）、`Admin/ProductVariantResource`（管理用は生の stock も返す）
- `Admin/ProductController`（index は `?q` ilike 部分一致・`?category` slug・20 件ページング）。ルートは `apiResource('products')`（5 本すべて使う）
- **R4 変更**: Store / Update を `ProductRequest` 1 つに（CategoryRequest と同じく slug unique の ignore だけが違った）。テストの `adminUser()` は共通の `admin()` に置き換え
- `DeleteProduct` のバケット上の画像実体の掃除は、StorageService を作る Step 25 で足す
- Feature テスト 9 本（在庫合計のテストは R3 でフレークしていたので 5 回連続で実行し安定を確認）。`php artisan test` 164 passed

**Step 25 — 2026-10-16 商品画像管理 + StorageService**（3 コミット）
- 25a `league/flysystem-aws-s3-v3` 導入、`StorageService`（`put` で `{prefix}/{ulid}.{ext}` キーを返す / delete / deleteMany / exists）、`DeleteProduct` にバケット実体の掃除を追加
- 25b `Admin/ProductImage` の Create / Delete / Reorder Action（reorder はその商品の画像 ID を過不足なく指定させ、他商品混入は 422）、Request 2 つ
- 25c `ProductImageController`、画像 3 ルート（URL が apiResource の規約と合わないので手書き）
- **R4 修正**: 保存時の拡張子をクライアントのファイル名ではなく中身（MIME）から決める（`extension()`）。R3 は `photo.html` なら中身が JPEG でも `.html` で保存した → テスト追加
- **R4 変更**: 削除は「DB の行 → バケット」の順（`DeleteProductImage` / `DeleteProduct`）。失敗しても残るのは参照されないファイルだけで、画像切れにならない
- Feature テスト 9 本（R3 8 本 + 拡張子）。gd 非搭載なので `UploadedFile::fake()->create(..., 'image/jpeg')`
- 確認: curl で**実 RustFS**に `tiny.html`（中身は JPEG）をアップロード → `.jpg` で保存・バケットに 134 bytes → 削除 204 → バケットから消えた。`php artisan test` 173 passed

**Step 26 — 2026-10-16 バリアント管理**（2 コミット）
- `Admin/Variant` の Create（position 自動採番）/ Update（size 不変）/ Delete（order_items は SET NULL）Action
- `Store/UpdateVariantRequest` は `withValidator` で size + color 複合ユニークを部分 UNIQUE と同条件で事前チェック（color null / not-null を出し分け）→ DB 例外にせずフォーム向け 422。作成と更新でルールが違う（size 必須か・自分を除外するか・エラーの付く項目）ので 2 つのまま
- **R4 変更**: ルートを `apiResource('products.variants')->shallow()->only(['store','update','destroy'])` に（R3 の手書き 3 本と同じ URL）
- Feature テスト 9 本。`php artisan test` 182 passed

**Step 27 — 2026-10-16 注文管理 + 発送通知メール**（3 コミット）
- 27a `SendOrderShippedJob` / `OrderShippedMail` / `mail/order-shipped`、`TransitionOrderStatus` に ship（shipped_at + 発送通知、`afterCommit`）を戻す
- 27b `GET /api/admin/orders`（全ユーザー横断、`?status`（`Rule::enum`）・`?customer_id`、新しい順・20 件、`withSum` で item_count、顧客情報付き）/ `GET /api/admin/orders/{order}`（明細・配送先・顧客・決済）/ `PUT /api/admin/orders/{order}/status`（`UpdateOrderStatusRequest` は shipped / completed / cancelled のみ。pending / paid は Webhook だけ）
  - **R4 変更**: ルートを `apiResource('orders')->only(['index','show'])` + status の 1 本に。ルートモデルバインディング（注文番号）で、R3 の「手で探して 404」×2 を削除
  - **R4 変更**: 管理用 `OrderResource` は利用者用 `Order\OrderResource` を継承し、`customer` と詳しい `payment` だけを足す（R3 は配送先・金額などを 2 ファイルに重複して書いていた）
- 27c Feature テスト 8 + 11 本（`statusAdmin()` / `orderAdmin()` は共通の `admin()` に）
- 確認: curl で paid の注文を shipped に → shipped_at が入り、Mailpit に発送通知（宛先は購入者）、paid に戻そうとすると 422。`php artisan test` 201 passed

**Step 28 — 2026-10-16 会員一覧・詳細 + ダッシュボード統計**
- `GET /api/admin/customers`（`role=customer`、`withCount('orders')`、`?q` name/email ilike、20 件）/ `GET /api/admin/customers/{customer}`（管理者の id は 404。注文一覧は `/admin/orders?customer_id=`）
- `GET /api/admin/stats` … `orders_count` / `revenue_total`（paid・shipped・completed の累計。月・日の売上は Step 30 の売上ダッシュボード API が担当するので役割は重ならない）/ `pending_count` / `sold_out_count`・`low_stock_count`（公開商品・全 variant 合算）/ `recent_orders`（直近 5）
- **R4 変更**: 会員のルートを `apiResource('customers')->only(['index','show'])` に
- Feature テスト 6 + 3 本。curl で Seeder データの stats（注文 0 件・全商品とも variant 合算では在庫あり → 売り切れ・残りわずかは 0）と、admin の id を customers で引くと 404 を確認。`php artisan test` 210 passed

**Step 29 — 2026-10-16 軽量 CMS API**（2 コミット）
- 29a 公開 `GET /api/content` … 4 キーを `SiteContent::defaults()` で補完（`array_replace` で top-level を埋め、`lookbook.images` / `about.blocks` は保存値が丸ごと勝つ）
  - **R4 変更**: 補完処理を `SiteContent::allWithDefaults()` にまとめ、公開・管理の両 Controller から呼ぶ（R3 は同じ処理を 2 つの Controller に書いていた）
- 29b 管理 `GET / PUT /api/admin/content(/{key})` … `UpdateSiteContent` Action（`updated_by`）、`UpdateSiteContentRequest` は key ごとに rules 出し分け。`POST /api/admin/content/{key}/images` … `content/{key}/{ulid}.ext` に保存、`{ url: "/media/..." }`。`{key}` は `whereIn` で不正なら 404
  - 画像 URL は data JSON に `/media/...` 形式で直接持たせる（CMS の JSON は自由形式なので商品画像とは方式が違う）
- Feature テスト 3 + 7 本（`contentAdmin()` は共通の `admin()` に）。`php artisan test` 220 passed
