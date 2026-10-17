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

**Step 30 — 2026-10-16 売上ダッシュボード API（R4 の新機能）**（3 コミット）
- 30a `Domain/Sales/SalesPeriod`（DB を使わない期間計算。今日 / 今月 / 先月 / 過去 12 か月を JST の `[start, end)` で返す、0 埋め用の日付・月の一覧）。`addMonthNoOverflow` で 3/31 の「先月」が 3 月にずれない
  - Unit テスト 5 本（JST 11/01 00:30 = UTC 10/31 は 11 月 / 月の区切りの UTC 換算 / 2 月 28 日分 / 3/31 の先月 / 年またぎ 12 か月）。素朴な `subMonth()` に戻すと落ちることを確認
- 30b `Actions/Admin/GetSalesDashboard`: KPI（今月の売上・注文数・今日の売上）/ 日別（今月 1〜末日を 0 埋め）/ 月別（12 か月を 0 埋め）/ ランキング（カテゴリ × 全商品、今月の個数 desc → 売上 desc、前月比 = 今月個数 ÷ 先月個数・先月 0 なら null・小数 2 桁）
  - 期間の WHERE は JST の範囲を `->utc()` して渡す（Laravel は Carbon を時差変換せずに文字列化する）→ `orders(status, paid_at)` インデックスが効く。日・月の GROUP BY は `paid_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Tokyo'`
  - 日別と月別は `revenueSeries()` 1 つで作る（違いは書式とラベル一覧だけ）
- 30c `SalesController`（invokable）、`GET /api/admin/sales`。レスポンスは `{ data: { kpi, daily, monthly, ranking } }`（他の API に合わせ `data` で包む。docs/05 も更新）
- 決定（ユーザー承認）: ランキングに非公開商品も含める / 前月比は小数 2 桁 / paid 後に cancelled（返金）の注文は売上に含めない
- Feature テスト 6 本（KPI は paid・shipped・completed のみ / JST 10/01 00:30 は 10 月・JST 09/30 23:30 は 9 月 / 0 埋め 31 日・12 か月 / 並び順と前月比 / 削除済み商品はランキングから外れるが KPI には残る / 非 admin 403）。集計式を UTC のまま（`orders.paid_at`）にすると JST のテストが落ちることを確認
- 確認: tinker で境目のデータを作り手計算と一致。`php artisan test` 231 passed

### Phase 5 完了 = バックエンドの機能実装 完了
管理 API（カテゴリ / 商品 / 画像 / バリアント / 注文 / 会員 / 統計）、CMS、売上ダッシュボード API まで揃った。`php artisan test` 231 passed。次はフロントエンド（Next.js）。

## 機能実装フェーズ（フロントエンド・Next.js）

> 進め方（2026-10-16 ユーザーと決定）: 1 Step = 説明 → 実装 → `tsc` / `lint` / BFF を curl → ヘッドレス Chrome でスクショ（PC 幅・スマホ幅）→ ユーザーがブラウザで localhost:3000 を触る → レビュー → コミット

### 設計の決定 — ページごとの SC / CC（2026-10-16）
- `docs/08` §3.6 に一覧を追加。ルール: `page.tsx` / `layout.tsx` は全部 SC、CC は操作する部品だけ（理由はブラウザのデータ・操作で変わる・ポーリングの 3 つのみ）
- R3 から変える点: ① 操作後の再取得を `router.refresh()` に統一（R3 は自前 fetch / TanStack の initialData で SC と二重取得、取り直し専用の GET BFF ルート 3 本 → 削除）② URL パラメータは SC の `searchParams` から props で渡す（`useSearchParams` + `Suspense` を削除）③ `/cart` の page.tsx も SC に
- 「無理に SC にしている所」は無かった。あったのは逆向き（CC が SC と同じデータを取り直す・SC で読める値を CC で読む）
- `docs/08` §6 の決済フローを実装に合わせて修正（PaymentIntent は SC で作って client_secret を CC に渡す。R3 の docs は Client がマウント時に作ると書いていた）

### Phase 6 — ストアフロント（Step 31〜41）

**Step 31 — 2026-10-16 共通レイアウト**
- `globals.css`（4 色トークン `ink / paper / mist / graphite` を Tailwind v4 の `@theme inline` で `bg-ink` 等に。ダークモードなし）、`app/layout.tsx`（Geist、`<html lang="ja">`、title テンプレート `%s | EC-PORTFOLIO`）、`(shop)/layout.tsx`（Header + main `pt-16` + Footer）、`Header`（固定・下ボーダー・ロゴ + LOGIN + CART）、`Footer`、トップは仮の中身
- **R4 変更**: R3 はこの Step で `QueryProvider` / `CartHydration` / `AccountLink` / `CartCount` まで入れていたが、それぞれ使う Step（34 カート / 36 認証）で足す。今の LOGIN / CART はただのリンク
- 雛形のトップと `public/*.svg` を削除。`public/.gitkeep` を置く（R3 の本番ビルドで空の public が git に入らず `COPY /app/public` が失敗した罠を先回り）
- スクショ: `--screenshot` 単体はウィンドウが 500px 程度より狭くならず、390px で撮ると右が切れる → CDP の `Emulation.setDeviceMetricsOverride` で撮るスクリプト（scratchpad の `shot.mjs`）を用意。PC 1280・スマホ 390 とも横スクロールなし（`scrollWidth` = 幅）
- 確認: `tsc` / `lint` パス、`/` 200・title `EC-PORTFOLIO`

**Step 32 — 2026-10-16 データ取得層（ISR）+ 商品カード + トップのカテゴリ**（2 コミット）
- 32a `lib/types.ts`（R4 は使う Step ごとに型を足す。今回はカタログの分）、`lib/revalidate.ts`（タグ `products` / `product:{slug}` / `categories` / `content` と保険の再検証間隔）、`lib/categories.ts` / `lib/products.ts`（`apiFetch` に `next: { tags, revalidate }`）
  - **R4 追加**: `lib/format.ts` の `formatYen()`（R3 は `¥{price.toLocaleString("ja-JP")}` を 28 か所に直書き）
- 32b `ProductMedia`（NO IMAGE・ホバーで 2 枚目、JS 不要の `group-hover`）、`ProductCard`（NEW / LOW STOCK / SOLD OUT バッジ）、`CategoryGrid`（カテゴリごとに全公開商品、0 件のカテゴリは出さない）、トップを CategoryGrid に
- すべて SC（§3.6）
- 確認: `tsc` / `lint` パス、16 商品が NO IMAGE + NEW で並ぶ。**ISR**: frontend を再起動してキャッシュを空にした後、1 回目は Laravel に 2 本（products・categories）、2・3 回目は 0 本（backend の nginx アクセスログで計数）。`.next/cache/fetch-cache` のファイルを消すだけでは dev サーバーのメモリ上のキャッシュが残る点に注意
- スクショ: PC 4 列 / スマホ 2 列、横スクロールなし。LOW STOCK / SOLD OUT は Seeder の商品が variant 合算ではどれも在庫ありなので出ない（表示は在庫を変える Step で確認）

**Step 33 — 2026-10-16 トップの CMS セクション + 画像配信**（2 コミット）
- 33a `lib/content.ts`（`GET /api/content`、タグ `content`）、`SiteContent` 型、`app/media/[...key]/route.ts`（S3 `GetObject` プロキシ、`forcePathStyle`、`Cache-Control: public, max-age=31536000, immutable`）
  - **R4 追加**: `/media` で配信するキーを `products/` と `content/` の下に限定（R3 はバケットのどのキーでも読めた）。`..` も 404
- 33b `Hero`（CMS の背景画像 + 見出し）/ `BrandConcept` / `Lookbook`（横スクロール、0 枚なら出さない）/ `AboutSection`（左右交互）。トップは Hero → Concept → Lookbook → CategoryGrid → About
  - **R4 修正**: Hero の高さを `h-[calc(100svh-4rem)]` に（R3 は `h-screen` で、固定ヘッダー 64px 分だけ最初の表示からはみ出していた）。スマホのスクショで Hero の下端が画面下端ぴったり
- 詰まり: `tsc` が `.next/types/validator.ts` で「ルートは /bff/health しか無い」前提の型エラー → 開発サーバーが新しいルートを読み込む前に生成された古い型。`/media` に 1 回アクセスしてから再実行で解消
- **R4 変更（ユーザーと決定）**: 型の置き場所を種類ごとに。`lib/types.ts` → `lib/types/`（`api` / `catalog` / `cms` + `index.ts` で再エクスポート。import パスは `@/lib/types` のまま）。フォームの入力の型は `z.infer` だけ（手書きの Payload を作らない）、props はコンポーネント内。`docs/08` §7 を書き直し
- 確認: 管理 API で商品 1 に画像 2 枚・Hero と Lookbook に CMS 画像をアップロード → `/media/...` 200 `image/jpeg`・1 年キャッシュ、トップに表示。`/media/secret/...` と `..` は 404

**Step 34 — 2026-10-16 商品詳細 + カート**（3 コミット）
- 34a カートの土台: `lib/constants.ts`、`lib/stores/cart.ts`（zustand + persist、key `ecp-cart`、`skipHydration: true`）、`CartHydration`（マウント後に `rehydrate()`。SSR は常に items: [] なので hydration mismatch を避ける）、`CartCount`（数量合計）を Header に、`app/layout.tsx` に `CartHydration`
  - **R4 修正**: カートの 1 明細を 10 個（`cart_max_quantity_per_line`）に収める `clampQuantity`（R3 は押した回数だけ増え、11 個以上で注文すると 422）
  - `CartItem` は API の型ではなくストアが持つ形なので `lib/stores/cart.ts` に定義（docs/08 §7 のルール）
- 34b 型（`ProductVariant` / `SizeChart` / `ProductDetail` を `lib/types/catalog.ts` に）、`getProduct()`（404 は null、タグ `product:{slug}` + `products`）、`Gallery`（スマホは横スワイプ・PC は縦積み）/ `Accordion`（`<details>` で JS 不要 = SC のまま）/ `SizeChartTable`
- 34c `/products/[slug]`（SC・ISR。`generateMetadata` で `notFound()` → ストリーミング前に 404 が確定する。R3 の「loading.tsx があると 404 なのに 200」の罠を避けるため `(shop)` に loading.tsx は置かない）、`VariantSelector`（CC。色 → サイズ、SOLD OUT は disabled）、`(shop)/not-found.tsx`
- 確認: `/products/boxy-cotton-t-shirt` 200・title「Boxy Cotton T-Shirt | EC-PORTFOLIO」、不明 slug 404。CDP で操作: Black → M を選ぶと ADD TO CART が有効 → 11 回押すとヘッダー `Cart (10)` で止まる・localStorage に quantity 10・リロード後も 10。スマホ横スクロールなし
  - 在庫 4 の M でもカートには 10 入る（在庫との突き合わせは /cart の再検証 = Step 35 の役目）
  - CDP の操作用ヘルパー（scratchpad の `cdp.mjs`）を用意

**Step 35 — 2026-10-16 カートページ + 在庫の再検証**（2 コミット）
- 35a `QueryProvider`（ここで初めて TanStack Query）を root layout に、`lib/types/cart.ts`（`CartLineValidation`）、`lib/cart.ts` + `GET /bff/cart/validate?ids=`（Laravel の `variant_ids[]` に変換）、`useCartValidation`（variant_id の集合をキーにキャッシュ → 数量の ± では再取得しない。取得前は楽観的に available）
  - **R4 追加**: `useCartHydrated()`（`persist.hasHydrated` / `onFinishHydration`）。復元前は items が必ず空なので、これを見ずに描くと中身があっても一瞬 Your cart is empty が出る（R3 の挙動）→ 復元までは Loading
- 35b `lib/cart-summary.ts`、`CartLine` / `CartSummary` / `CartView`（CC）、`/cart` の page.tsx は SC（metadata と見出しだけ。§3.6）
  - **R4 変更**: 送料・合計の計算は R3 では `summarizeCart`・`CartSummary`・カートページ本体の 3 か所、「この行は買えない」の判定は `CartLine` と `summarizeCart` の 2 か所にあった → `lineProblem()` / `currentUnitPrice()` / `summarizeCart()`（`untilFreeShipping` も返す）に集約。`CartSummary` は結果を表示するだけ（フックも状態も無いので "use client" も不要）
- 確認（CDP で操作）: M ×10（在庫 4）→「在庫は 4 点までです。」・CHECKOUT 不可・¥120,000 / FREE → − を 6 回で 4 個 → 注意書きが消え CHECKOUT 可・+ は disabled → 空のカートは Your cart is empty。サーバーの HTML は Loading…（空の表示を出さない）。スマホ横スクロールなし

**Step 36 — 2026-10-16 ログイン・会員登録・ログアウト**（4 コミット）
- 36a `lib/types/account.ts`（User）、`lib/schemas/{login,register}.ts`、`lib/auth.ts`（サーバー専用。Cookie `ecp_token` は httpOnly / secure(本番) / sameSite=lax / 30 日、login / register / logout / me、`requireAuth`）、`middleware.ts`（Cookie の有無だけ）、`lib/login-redirect.ts`（戻り先をサイト内のパスに限る）
  - **R4 修正**: middleware の戻り先に `?` 以降も含める（R3 は pathname だけで、`/checkout/payment?order=...` からログインし直すと `?order` が落ちた）。curl で `redirect=%2Fcheckout%2Fpayment%3Forder%3D...` を確認
  - **R4 変更**: `publicPost()` / `bearer()` でヘッダーの組み立てを共通化（R3 は関数ごとに書いていた）。Payload 型は手書きせず `z.infer`（docs/08 §7）
  - 詰まり: 起動後に追加した `middleware.ts` は dev サーバーが読み込まない → `docker compose restart frontend`
- 36b BFF `/bff/login` `/bff/register` `/bff/logout` `/bff/me`（トークンはブラウザに返さず Cookie にだけ入れる）
- 36c `Field`、`lib/form-errors.ts`（`applyLaravelErrors`）、`LoginForm` / `RegisterForm`、`/login` `/register`（SC が `searchParams` を読んで props で渡す。Suspense なし）
  - **R4 修正（セキュリティ）**: 会員登録後の遷移も `resolveLoginRedirect` に通す。R3 は `searchParams.get("redirect") || "/account"` をそのまま `router.push` していて、`/register?redirect=//evil.example` で登録直後に外部サイトへ飛ばせた（オープンリダイレクト）
  - **R4 変更**: Laravel の 422 をフィールドに割り当てるループを `applyLaravelErrors()` に（R3 は 5 フォームに重複）
- 36d `AccountLink`（CC。`/bff/me` を TanStack Query の `["session"]` で）を Header に、`LogoutButton`、`/account`（仮。名前と LOGOUT。メニューは Step 38・39）
- 確認（CDP で操作）: `/register?redirect=//evil.example` で登録 → `/account`（localhost のまま）・ヘッダー Account・`document.cookie` に `ecp_token` が無い（HttpOnly）→ ログアウトで `/`・ヘッダー Login → パスワード違いで「These credentials do not match our records.」→ 正しいパスワードで `?redirect=/cart` に戻る。curl でも 422 / 200 + `Set-Cookie: ...; HttpOnly; SameSite=lax`。確認用ユーザーは削除
  - 確認方法の罠: 開いた直後（hydration 前）にボタンを押すとフォームの onSubmit が付いておらず何も起きない。初回表示はページのコンパイルで数秒かかる

**Step 37 — 2026-10-16 パスワードリセットの画面**（2 コミット）
- 37a `lib/auth.ts` に `sendPasswordReset` / `resetPassword`（`publicPost` で実 IP ヘッダー付き）、BFF `/bff/forgot-password` `/bff/reset-password`、スキーマ
  - **R4 変更**: 「新しいパスワード + 確認用」のルール（8 文字以上・一致）を `lib/schemas/new-password.ts` に共通化し、会員登録・リセット（・Step 39 のパスワード変更）で使う（R3 は 3 スキーマに重複）
- 37b `ForgotPasswordForm`（成功・失敗に関わらず中立表示）、`ResetPasswordForm`、`/forgot-password` `/reset-password`
  - **R4 変更**: `/reset-password` の token / email は SC の page で読み、欠けていれば「リンクが正しくありません」をサーバーで出し分ける。フォームは props で受け取る（R3 は `useSearchParams` + Suspense）
- 確認（CDP + Mailpit）: 申し込み → 中立メッセージ → メールのリンク → 確認用が違うと「パスワードが一致しません」→ 設定で `/login?reset=1`・「パスワードを変更しました」→ 新パスワードでログインして `/account` → 同じリンクの再利用は「This password reset token is invalid.」。確認用ユーザーとメールは削除

**Step 38 — 2026-10-16 マイページ（注文履歴・注文詳細）**（2 コミット）
- 38a `lib/types/order.ts`、`lib/orders.ts`（`getMyOrders` / `getMyOrder`。404 は null）、`OrderStatusBadge`、`ShippingAddress`
  - **R4 修正**: 日時の表示に `timeZone: "Asia/Tokyo"` を付けた `formatDate` / `formatDateTime` を `lib/format.ts` に。R3 は timeZone なしの `toLocaleString` で、SC（サーバーのコンテナは UTC）だと 9 時間ずれていた。コンテナ内の node で `2026-10-15T23:00:00Z` → R3 の書き方「2026/10/15 23:00:00」/ R4「2026/10/16 8:00:00」を確認
  - **R4 変更**: 日付の整形関数（R3 は一覧・詳細・管理画面のファイルごと）と配送先の表示（R3 は 3 か所）を共通化
- 38b `AccountMenu` + `/account`、`OrderList` + `/account/orders`、`/account/orders/[number]`（他人・不明は `notFound()`、pending なら COMPLETE PAYMENT と直近の決済エラー）。すべて SC
- 確認（CDP）: 確認用ユーザー s38 に pending（JST 10/16 8:00、決済エラー付き）/ paid / shipped と他人の注文を作成 → 一覧に 3 件・点数・合計・バッジ、詳細は「2026/10/16 8:00:00」・COMPLETE PAYMENT・「カードが拒否されました。」、他人の注文番号は 404

**Step 39 — 2026-10-16 住所録・プロフィール編集**（3 コミット）
- 39a `lib/bff.ts` の `withSession()`（Cookie のトークン → 無ければ 401 → handler → ApiError は同じ形で中継）と `noContent()`、`lib/api.ts` に `bearer()` / `bearerJson()`、`/bff/me` を書き換え、`Address` 型、`lib/addresses.ts`、住所の BFF（POST / PUT / DELETE / default）
  - **R4 変更**: ログインが必要な BFF の定型 10 行を `withSession()` に（R3 は全ファイルに重複）。住所の一覧取得用の GET `/bff/addresses` は作らない（§3.6）
- 39b `lib/schemas/address.ts`、`AddressForm`（`onSubmit` は Response を返し、エラーの割り当てはフォームが `applyLaravelErrors` で行う）、`AddressBook`（CC）、`/account/addresses`（SC が一覧を取る）
  - **R4 変更**: 操作の後は `router.refresh()`（`useTransition` で描き直し中は薄く表示）。R3 は TanStack Query の initialData + 自前の取り直し。住所の表示は Step 38 の `ShippingAddress` を使い回す
- 39c `lib/auth.ts` に `updateProfile` / `updatePassword`、`PUT /bff/me`・`PUT /bff/me/password`、スキーマ（パスワード変更も `new-password.ts` を使う）、`ProfileForm` / `PasswordForm`、`/account/profile`
- 確認（CDP）: 住所 2 件追加（1 件目に自動で★）→ 会社を★に → 自宅を編集（千代田区 → 新宿区）→ 郵便番号の形式エラー → ★の会社を削除で自宅に★が移る。氏名を変更「保存しました。」→ 現在のパスワード違いで「The password is incorrect.」→ 正しく変更 → 古いパスワードのログイン 422・新しいパスワード 200。確認用ユーザーは削除
  - 確認方法の罠: `router.refresh()` の描き直しは初回コンパイルで数秒かかる → 一覧の件数やメッセージが変わるまで待つ形に（固定の sleep だと次の操作が先に走る）

**Step 40 — 2026-10-16 チェックアウト（配送先 → 注文作成）**（3 コミット）
- 40a 共通部品: `AddressFields`（住所の入力欄 7 つ。`AddressForm` とチェックアウトで使う）、`AmountSummary`（小計・送料・合計。`CartSummary`・マイページの注文詳細・チェックアウトで使う）
  - **R4 変更**: R3 は入力欄 7 つを 2 か所、小計〜合計の表示を 3 か所以上に重複して書いていた
- 40b `lib/orders.ts` の `createOrder`、`CreateOrderRequest` 型（API の入力なので types/order.ts に）、`POST /bff/orders`（`withSession`）。**R3 にあった使われない GET `/bff/orders` は作らない**
- 40c `CheckoutClient`（CC）/ `AddressPicker`（表示だけ。"use client" 不要）/ `OrderReview`、`/checkout`（SC が住所録を取る）。Place Order で `/checkout/payment?order=...` へ（決済画面は Step 41）
  - **R4 修正**: `OrderReview` の「買えない行」をカートと同じ `lineProblem` に（R3 は販売終了・売り切れだけで、在庫超過を見落としていた）。チェックアウトでも `useCartHydrated`（一瞬「空のカート」を出さない）
  - ラジオ・チェックボックスを `accent-ink`（ブラウザ既定の青をやめてモノトーンに）
- 確認（CDP）: 住所録が空 → 新しい住所の入力欄が開いた状態・空のまま押すと検証エラー → 新しい住所で注文 `EC-...-0001` → 住所録に保存され★・選択済みで表示 → 住所録の住所で 2 回目 `EC-...-0002`。DB: 1 件目は置き換えで cancelled（在庫を戻す）、2 件目は pending、在庫 4 → 2 → カートを 5 個にすると「在庫は 2 点までです」で Place Order が出ない。後片付けで 2 件目を `cancelIfPending`（在庫 4 に戻る）してユーザーを削除

**Step 41 — 2026-10-16 Stripe 決済（Payment Element）+ 完了ページ**（3 コミット）
- Stripe のテストキー 3 つ（`sk_test` / `pk_test` / `whsec`）を R3 の `backend/.env` から R4 の `backend/.env` にコピー（ユーザー了承済み。git には入らない）。`whsec` は `stripe listen --print-secret` と一致を確認。publishable key は API が返すので frontend の env は不要
- 41a `lib/checkout.ts`（`createPaymentIntent`、`bearerJson`）、`PaymentIntentResponse` 型、`GET /bff/orders/[number]`（完了画面のポーリング専用。§3.6 の理由 ③）、`useOrderStatusPolling`（2.5 秒間隔・最大 60 秒、pending でなくなったら停止）
- 41b `StripeProvider`（`loadStripe` + `<Elements>`、モノトーンの appearance）、`PaymentForm`（`confirmPayment` → `return_url` = `/checkout/complete?order=`）、`/checkout/payment`（SC が注文を確認し PaymentIntent を作る。pending 以外は完了画面へ、503 / 409 はパネル表示）
- 41c `CheckoutComplete`（paid でカートを空に / cancelled は失敗 / pending はポーリング、`redirect_status=failed` は再試行の案内）、`/checkout/complete`
  - **R4 変更**: `redirect_status` は SC の page で読んで props で渡す（R3 は `useSearchParams` + Suspense）。金額は `formatYen`
- 確認（本物の Stripe テストモード + `stripe listen --forward-to localhost:8000/api/stripe/webhook`）: 注文 `EC-…-0001`（¥12,800）→ 決済画面に Payment Element（iframe 4 つ）→ Stripe CLI で `stripe payment_intents confirm <pi> --payment-method pm_card_visa` → Webhook（payment_intent.succeeded ほか）すべて 200 → DB で paid・paid_at・payments=succeeded → 完了画面「ORDER CONFIRMED」・カート 0 → paid の注文で決済画面を開くと完了画面へ → Mailpit に注文確認メール
  - 後片付けで paid → cancelled（管理者の操作と同じ `TransitionOrderStatus`）→ Stripe で返金（`charge.refunded` が届く）・`refunded_at`・在庫 3 → 4 に戻る、まで確認してから削除
  - カード番号の入力は Stripe の iframe 内なので CDP では入れず、画面からの支払いはユーザーがブラウザで確認する

### ストアフロント完成（Step 31〜41）

### Phase 7 — 管理画面（Step 42〜49）

**Step 42 — 2026-10-16 管理画面のレイアウト + ダッシュボード**（2 コミット）
- 42a `requireAdmin()`（未ログイン → /login、非 admin → /。本当の権限チェックは Laravel）、`app/admin/layout.tsx`（ストアの Header/Footer を持たない独自の枠。PC は左サイドバー・スマホは上に横スクロールのナビ）、`AdminNav`（CC。`usePathname` で現在のページを強調）
  - **取り消した変更（自分の誤り）**: 「layout と page の両方で requireAdmin() を呼ぶので /api/me が 2 回呼ばれる」と考えて React の `cache()` で包んだが、backend のアクセスログで数えると cache なし（R3 と同じ）でも 1 回だった。Next.js は 1 回のサーバー描画の中の同じ GET の fetch を自動で 1 回にまとめる（Request Memoization）ため。cache() は外し、理由をコメントに残した
- 42b `lib/types/admin.ts`（`AdminOrderListItem` / `DashboardStats`）、`lib/admin/dashboard.ts`、`StatCard`、`OrderTable`（最近の注文・注文一覧・顧客の注文履歴で共用。R4 は最初から部品として作る）、`/admin`（Orders / Pending / Low Stock / Sold Out + 最近の注文）
- 確認（CDP）: 未ログイン → `/login?redirect=%2Fadmin`、一般ユーザー → `/`、admin → `/admin`。数字と最近の注文 3 件。スマホは横スクロールなし（表だけ枠内で横スクロール）
- 詰まり（ユーザーから）: 管理者でログインできない → ユーザーが backend/.env の `ADMIN_*` を書き換えた後、`AdminUserSeeder` を流していなかった（Seeder は実行時にしか .env を読まない）。`db:seed --class=AdminUserSeeder` で `admin@example.com` を作成、旧 `admin@ec-portfolio.example.jp` はユーザーの指示で削除。メールをキーに updateOrCreate するので、メールを変えると別の管理者が増える点に注意

**Step 43 — 2026-10-16 売上ダッシュボードの画面（R4 の新機能）**（3 コミット）
- 43a `lib/types/admin.ts` に売上の型（`SalesKpi` / `DailyRevenue` / `MonthlyRevenue` / `CategoryRanking` / `SalesDashboard`）、`lib/admin/sales.ts`（`GET /api/admin/sales`）
- 43b `SalesKpiCards`（SC）、`SalesChart`（CC。**グラフのライブラリなし**。棒は div の高さ = 売上 ÷ 期間内の最大値、日別⇔月別は `useState` だけで再取得しない、ホバーで金額、目盛りは最大値と 0、`role="img"` + aria-label）、`SalesRanking`（SC。前月比は % 表示、先月 0 は「—」、今月 0 個の行は灰色）
- 43c 最初は `/admin` に組み込んだが、**ユーザーの判断で `/admin/sales` に別ページとして分離**（サイドバーに Sales を追加。`/admin` は運用の数字と最近の注文だけ）。docs/05・08 も更新
- 確認（CDP）: 今月・先月・2 か月前・キャンセルの試験注文（既存の注文も含めて期待値を手計算）→ KPI ¥99,500 / 5 件 / 今日 ¥47,500、日別は 31 本で 10/01 ¥24,000 = 50.53%・10/05 = 58.95%・10/16 = 100%（JST 10/01 00:30 の注文が 1 日に入る）、月別は 12 本で 8 月 12.06%・9 月 54.27%・10 月 100%、TOPS のランキングは T シャツ 4 個（先月 1 → 400%）→ ポロ 1 個 ¥21,000（先月 2 → 50%）→ ロングスリーブ 1 個 ¥16,000（—）→ オックスフォード 0。すべて手計算と一致
  - スマホの幅で日別ラベルの 30 と 31 がくっつく → 月末のラベルをやめて 1・5・…・30 に

**Step 44 — 2026-10-16 カテゴリ管理**（2 コミット）
- 44a `AdminCategory` 型、`lib/admin/categories.ts`、BFF `POST /bff/admin/categories`・`PUT/DELETE /bff/admin/categories/[id]`・`PUT /bff/admin/categories/reorder`（`withSession` + 成功時に `revalidateTag`。名前・slug の変更と削除は商品ページにも出るので `products` も消す）
  - **R4 変更**: 一覧の GET の BFF は作らない（R3 は CC が自分で一覧を取り直していた）
- 44b `adminCategorySchema`、`CategoryForm`（追加・編集で共用。`onSubmit` は Response を返し、422 は `applyLaravelErrors` で入力欄の下に出す）、`CategoryManager`（CC。一覧は props、操作後は `router.refresh()`、削除は `window.confirm`、▲▼ で全 id の順番を送る）、`/admin/categories`（SC）
  - **R4 変更**: 一覧は SC が取って props で渡す（docs/08 §3.6）。slug 重複のエラーは欄の下（R3 はフォームの上に 1 行）
- 確認（CDP）: 追加 → 末尾に出る、slug `tops` の重複 → 欄の下に「The slug has already been taken.」、Tops の名前変更 → トップページにすぐ反映（ISR のタグ無効化）、▲ で並べ替え、商品ありの削除 → 409「このカテゴリには商品が 4 件あります…」、空のカテゴリの削除。後片付けで名前を戻し、確認用カテゴリを削除。スマホは横スクロールなし（表だけ枠内）

**Step 45 — 2026-10-16 商品の一覧・新規作成**（2 コミット）
- 45a `ApiPaginated`、`AdminProductListItem` / `AdminProductVariant` / `AdminProduct` 型、`adminProductSchema` + `AdminProductPayload`、`lib/admin/products.ts`（`revalidateProductCaches` は Step 46 の画像・バリアントの BFF 用）、BFF `POST /bff/admin/products`・`PUT/DELETE /bff/admin/products/[id]`
  - **R4 変更**: GET の BFF は作らない（R3 は画像・バリアントの部品の取り直し用）。`AdminProductPayload` は types.ts に手書きせず「`z.infer` + サイズ表」で作る（docs/08 §7）
  - **R4 修正**: slug を変えたとき、変更前の slug の商品ページのキャッシュも消す（R3 は新しい slug だけ消していたので、古い URL がキャッシュから出続けることがあった）。curl で旧 URL が 404 になるのを確認
- 45b `/admin/products`（SC。検索・カテゴリ・ページは URL のクエリだけ、`<form method="get">` と Link）、`Pagination`（SC。注文・会員の一覧でも使う。R4 で部品化）、`ProductForm`（新規・編集で共用）、`SizeChartEditor`、`NewProductForm`（作れたら編集ページへ）、`/admin/products/new`
  - **R4 変更**: 422 は入力欄の下（`applyLaravelErrors`）。`size_chart.*` のエラーは欄と対応しないのでフォームの下に出す。`SizeChartEditor` は React 19 の「ref を props で受ける」書き方（R3 は forwardRef）
  - **R4 修正**: サイズ表の数値の `0` が捨てられていた（R3 は `n !== 0` で空欄を除こうとしていた）。空欄は文字列の段階で除く
- 確認（CDP）: 一覧 16 件、`q=shirt` → 2 件、`category=accessories` → 4 件（select も Accessories のまま）、空で送信 → 7 項目に zod のエラー、slug 重複 → 欄の下に Laravel の 422、サイズ表つきで作成 → `/admin/products/{id}` へ移動・DB の size_chart は `{S:[66,52], M:[68,54]}`（空欄は詰まる）・care は null。確認用の商品は削除

**Step 46 — 2026-10-16 商品の編集・画像・バリアント**（2 コミット）
- 46a `/admin/products/[id]`（SC。商品とカテゴリを `Promise.all` で同時に取る。404 は notFound）、`EditProductForm`（`ProductForm` + 商品の削除）、`ProductImagesManager`（アップロード・▲▼・削除）、`lib/admin/productImages.ts`、BFF 3 本（`POST /bff/admin/products/[id]/images`・`PUT …/images/reorder`・`DELETE /bff/admin/product-images/[id]?product=`）
  - **R4 変更**: 部品を並べるのは SC の page（R3 は `EditProductClient` という CC がまとめていた）。画像は props + `router.refresh()`（R3 は state に持って GET の BFF で取り直し）。並べ替えの BFF は 204（一覧を返さない）
- 46b `adminVariant` スキーマ（新規・編集で 1 つ。`CreateVariantPayload` / `UpdateVariantPayload` は `z.infer` から）、`lib/admin/variants.ts`、BFF `POST /bff/admin/products/[id]/variants`・`PUT/DELETE /bff/admin/variants/[id]?product=`、`VariantForm`、`VariantsManager`
  - **R4 変更**: 一覧は props + `router.refresh()`。422 は欄の下。Laravel は「サイズ・色の重複」を `size` に付けるので、編集フォーム（size は表示だけ）でも errors.size をフォームの下に出す（R3 はフォームの上に message だけ）
- 確認（CDP）: 画像 2 枚アップロード → Primary / Hover・商品ページも同じ順、▼ で入れ替え → 商品ページの順も変わる、1 枚削除、名前を変えて保存 → パンくずと商品ページが変わる、slug 重複 → 欄の下、商品削除 → 一覧へ・商品ページ 404、存在しない id → 404。バリアント S・M を追加 → 商品ページに S・M、sku 重複 → 欄の下、S を色なしでもう一度 → 「このサイズ・色の組み合わせは既に登録されています。」、S の在庫を 0 → 商品ページで S が押せない、M を削除。確認用の商品は削除（バケットの画像も消えて元の 2 枚だけ）
  - ローカルでは操作 → 画面に反映まで 7〜8 秒かかった。Docker の VM が重く（CPU 66%）、Laravel の 1 回の呼び出しが約 0.8 秒、操作 1 回で 3〜4 回呼ぶため。コードの問題ではない

**Step 47 — 2026-10-16 注文管理・会員**（2 コミット）
- 47a `AdminOrderDetail` 型（利用者向けの `OrderDetail` + 顧客 + 詳しい決済情報）、`lib/admin/orders.ts`、BFF `PUT /bff/admin/orders/[number]/status`、`OrderStatusActions`（CC）、`/admin/orders`（SC。ステータス絞り込み + `Pagination`）、`/admin/orders/[number]`（SC。CC はボタンだけ）
  - **R4 修正**: 日時を `formatDateTime`（日本時間）に（R3 は `toLocaleString` でサーバーの UTC のまま、9 時間ずれていた）
  - **R4 修正**: キャンセルで在庫が戻ったら、商品一覧と明細の商品ページのキャッシュを消す（R3 は消さず、最大 10 分「売り切れ」のままのことがあった）
  - **R4 変更**: 配送先・金額・バッジはストア側の部品を使う。キャンセルのボタンを状態ごとに（`Cancel Order` / `Cancel & Refund` / `Cancel`。R3 はどれも「Cancel Order」）。顧客の名前から会員詳細へリンク
- 47b `AdminCustomer` 型、`lib/admin/customers.ts`、`/admin/customers`（SC。名前・メールの検索 + `Pagination`）、`/admin/customers/[id]`（会員の情報 + 注文履歴。`OrderTable` の顧客列なし）
  - **R4 変更**: 登録日は `formatDate`（日本時間）。会員と注文履歴は `Promise.all` で同時に取る（R3 は順番に）
- 確認（CDP。確認用の会員 + pending / paid / shipped の注文を tinker で作成）: pending を Cancel Order → cancelled・在庫 11 → 12、paid を Mark as Shipped → shipped・Mailpit に発送メール、shipped を Mark as Completed → 「これ以上変更できません」、completed → shipped を API に直接 → 422、存在しない注文番号 → 404。会員一覧・`q=S47` → 1 件・`q=nobody` → No customers found、注文詳細の顧客リンク → 会員詳細（注文 3 件・顧客列なし）、管理者の id と存在しない id → 404。在庫を戻し、確認用の会員と注文は削除

**Step 48 — 2026-10-16 CMS の編集（`/admin/content`）**（2 コミット）
- 48a `ContentKey` 型、`adminContent` スキーマ、`lib/admin/content.ts`、BFF `PUT /bff/admin/content/[key]`（保存したら `revalidateTag('content')`）・`POST …/[key]/images`（url を返すだけ。キャッシュは保存のときに消える）、`useContentSave`、`ContentImageUpload`
  - **R4 変更**: 「zod で確かめる → PUT → エラー / 保存しました」を `useContentSave` フックに（R3 は 4 セクションに同じ 25 行の `save()`）。GET の BFF は作らない（R3 にあったが未使用）
- 48b `ContentSaveBar`、`HeroSection`・`ConceptSection`・`LookbookSection`・`AboutSection`、`lib/array.ts`（`moveItem`）、`/admin/content`（SC が 4 セクションを並べる。R3 の `ContentEditor` ラッパーはなし）
  - **R4 修正**: Lookbook の key を画像の url に（R3 は配列の番号で、並べ替えると行の対応がずれることがあった）。確認で、追加した画像を先頭へ動かすと alt も一緒に動くのを確認
- 確認（CDP）: Hero の見出しを保存 → トップにすぐ出る、Concept を空で保存 → 「本文を入力してください」、Lookbook に画像を追加 → 先頭へ → alt を入れて保存 → トップの順番も変わる、About の見出しを空 → zod のエラー → 直して保存 → トップに出る。最後に保存前の内容（バックアップ）を BFF で書き戻した
  - **自分の誤り（後片付け）**: 確認で上げた画像だけを消すつもりで「今の CMS の data に含まれないファイル」を消したが、data を `json_encode` した文字列で比べたため（`/` が `\/` になる）全部が未使用と判定され、Step 33 の確認用画像（Hero 1 枚・Lookbook 2 枚）まで消した。Lookbook 2 枚は商品 1 の画像と同じものだったのでバケット内でコピーし、Hero は Next.js の画像キャッシュ（`/_next/image` の w=1920）に残っていた元の画像を取り出して、同じキー（ファイル名）で戻した。DB は変えていない。差し替え中に作られた画像キャッシュは `.next/cache/images` ごと消した。消す前に「消す対象の一覧」を出して確かめるべきだった

**Step 49 — 2026-10-16 仕上げ（エラー画面 + レスポンシブ）**（1 コミット）
- `app/global-error.tsx`（ルートレイアウトが落ちたとき。自前の `<html><body>`）、`app/not-found.tsx`（どのグループにも当たらない URL）、`app/error.tsx`、`app/(shop)/error.tsx`、`app/admin/{error,not-found}.tsx`、`app/(shop)/(cart)/loading.tsx`、`checkout/payment/error.tsx`
  - **R4 追加**: 決済ページの `error.tsx`（docs/08 §11「決済を開始できませんでした。カートに戻る」にあるのに R3 は作っていなかった）
  - **R4 追加**: `app/error.tsx`。Laravel を止めて `/admin/orders` を開くと、`admin/error.tsx` ではなく `global-error` が出た。error.tsx は同じフォルダの layout のエラーを受けられず（1 つ上の担当）、`admin/layout.tsx` の `requireAdmin()` が落ちると `app/` まで上がるため。R3 にも同じ穴があった。docs/08 §11 に追記
  - **R4 変更**: `global-error` は globals.css を読み込んで Tailwind のクラスで書く（R3 は style 属性に直書き）。各 error.tsx で `console.error(error)`
- 確認（CDP）: 404 → `/no-such-page` は素の 404・`/products/no-such-product` はヘッダー付き・`/admin/products/99999` と `/admin/orders/EC-XXXX` はサイドバー付き（すべて HTTP 404）。backend を止めて `/admin/orders` → `app/error.tsx`、`/account/orders` → `(shop)/error.tsx`、`/checkout/payment?order=…` → 決済の error.tsx（Back to Cart）。390px でストア 11 ページ・管理画面 11 ページすべて scrollWidth 390（横スクロールなし）

### フロントエンド完成（Step 31〜49）

### Phase 8 — テスト・CI・デプロイ

**Step 50 — 2026-10-17 フロントエンドのテスト（Vitest + Testing Library）**（2 コミット）
- 重い E2E（Playwright）は入れない（R3 と同じ）。`frontend/tests/` にソースと同じ構造で置く。`npm test` = `vitest run`
- 50a 土台（`vitest.config.mts`・`vitest.setup.ts` は R3 からコピー。`@types/node` は R3 で衝突した `^20` を避けて `^22`）+ ロジック: cart-summary（`lineProblem`・`untilFreeShipping` も）/ cart ストア（1 明細 10 個で止まる）/ login-redirect / revalidate / schemas
  - **R4 追加**: `format`（日本時間の日付の境目。テストは `TZ=UTC` で動かし、UTC 15:00 → 翌日の日付を確かめる。R3 の書き方だと同じ時刻が前日になるのも確認）、`form-errors`（422 を欄に割り当てる・409 は message）、`moveItem`
- 50b コンポーネント: VariantSelector / CartLine（上限 10 の + も）/ OrderStatusActions（R4 の状態別ボタンと確認文）
  - **R4 追加**: `SalesChart`（日別 31 本・最大の日が 100%・月別 12 本に切り替え・日別ラベル 1/5/…/30・売上 0 の期間は 0%）
- **合計 69 tests（12 ファイル）**。act 警告なし

**Step 51 — 2026-10-17 CI（GitHub Actions）**（1 コミット）
- `.github/workflows/ci.yml`（R3 からコピー）。main への push / PR で 2 ジョブを並列に
  - backend: `postgres:16` service + `shivammathur/setup-php@v2`（8.4）→ `pint --test` → `php artisan test`（`DB_HOST=127.0.0.1` で phpunit.xml の `db` を上書き）
  - frontend: `setup-node`（`.nvmrc` = 22）→ `npm ci` → `tsc --noEmit` → lint → vitest
  - `next build` は入れない（ISR のページをビルド時に Laravel から作るため。ビルドの確認はデプロイで。R3 と同じ）
- `frontend/.nvmrc`（R4 には無かった）
- 確認（push の前にローカルで）: backend コンテナで Pint 214 files PASS・Pest 231 passed。frontend は `git archive` で Git に入っているファイルだけを取り出し、素の `node:22` コンテナで `npm ci` → tsc → lint → vitest（69 passed）。push と GitHub Actions の結果はユーザーが確認

**デプロイ準備 — 2026-10-17 デモ注文の seeder（R4 追加。ユーザーの案）**（1 コミット）
- `DemoOrderSeeder`: デモ会員 10 人（demo01〜10@example.com）が過去 12 か月に 2〜5 回ずつ買った注文（ローカルで 34 件）。全部 shipped + payments succeeded（`pi_demo_…`）。今月・先月は 5〜7 件、ほかの月は 1〜3 件。`DatabaseSeeder` からは呼ばず `db:seed --class=DemoOrderSeeder --force` で個別に流す
  - 流し直すとデモ会員の注文を消して「今日」基準で作り直す（月が変わると「今月」が空になるので、見せる前に流し直す）
  - 本番には Faker（dev 依存）が入らないので factory は使わず値を直書き。乱数はシード固定。在庫は減らさず、メールも送らない
  - 詰まり: 日本時間の Carbon をそのまま Eloquent に入れると、タイムゾーンを変換せず壁時計の数字で保存されて 9 時間ずれる → `->utc()` してから入れる
- `DemoOrderSeederTest`（4 tests）: 全部 shipped・決済成功・小計 = 明細の合計 / 過去 12 か月に収まり今月・先月が 5 件以上 / 注文番号は注文日（JST）/ 流し直しても増えず、本物の注文と在庫に触らない
- 本番の管理者: ユーザーの判断で 1 つ（自分の Gmail）を面接官にも見せる。値は Railway の Variables（`ADMIN_*`）にだけ書く

**Step 52a — 2026-10-17 本番用の Dockerfile**（1 コミット）
- `backend/{Dockerfile,railway.json,.dockerignore}`・`frontend/{Dockerfile,railway.json,.dockerignore}` を R3 からコピー（`.dockerignore` に Dockerfile を入れない・`railway.json` で DOCKERFILE ビルダを指定、は R3 の罠の対策のまま）
  - **R4 変更**: backend の Dockerfile のコメントに scheduler（Start Command = `php artisan schedule:work`）を追記。frontend の Dockerfile から `NEXT_PUBLIC_SITE_URL` を外した（R4 のコードは使っていない）
- 確認（ローカルでビルド）: backend イメージで `class_exists(Faker\Factory)` が false（`--no-dev`）の状態で `DemoOrderSeeder` が流れる。frontend は `API_URL=host.docker.internal:8000` でビルド → トップは ○（ISR 10 分）、起動して `/`・`/products/…`・`/media/…` が 200、`/bff/health` が backend・DB とも ok、存在しない URL は 404
- `DemoOrderSeeder` の Pint の指摘（docblock の完全修飾名 → use 文）もここで直した。直前のコミットで Pint を流し忘れていた

**Step 52b — 2026-10-17 Railway デプロイ（本番稼働）**
- 新しいプロジェクト `EC-Portfolio2`（R3 は比較用に残す）に Postgres・bucket（sin）・backend・queue・scheduler・frontend。詳細は docs/04 の冒頭
  - frontend `https://frontend-production-e5f4e.up.railway.app` / backend `https://backend-production-e912a.up.railway.app`
- 進め方（R3 の罠を避ける順番）: 変数・ドメイン・Stripe Webhook を先に用意 → **backend だけ先に**接続（起動時に migrate）→ seed + `DemoOrderSeeder` → queue / scheduler / frontend を接続（frontend はビルド時に backend からトップを作るので、seed の後にする。R3 は初回のトップが空だった）
- 本番の通し確認（CDP + Stripe CLI）: 会員登録 → 注文 `EC-20261017-0001`（¥12,800）→ 決済ページに Payment Element → `stripe payment_intents confirm … pm_card_visa` → Webhook で paid → 管理者ログイン → 売上の「今日」に ¥12,800 → Cancel & Refund → cancelled・Refunded 表示・在庫 11 → 12。確認用の会員 2 人・注文・failed_jobs は、消す対象の一覧を出してから id 指定で削除
- 詰まり:
  - CLI の `railway environment edit --service-config` が「No changes to apply」→ MCP の `update_service` / `connect_service_source` で設定
  - `railway ssh` が `no_ssh_key` → `-i ~/.ssh/<Railway に登録済みの鍵>`
  - **注文確認メールのジョブが `Class "Resend" not found` で失敗**。R3 はデプロイ後の調整で `composer require resend/resend-php` していたが、R4 は引き継いでいなかった（ローカルは Mailpit なので気づけない）→ R4 でも追加
- メールは Resend の共有ドメイン（`onboarding@resend.dev`）なので、アカウント所有者のアドレスにしか届かない。独自ドメインは費用がかかるので取らない（ユーザーの判断。ブログで説明する）
