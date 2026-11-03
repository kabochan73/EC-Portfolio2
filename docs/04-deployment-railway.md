# デプロイ構成（Railway + Docker）（R4）

> **R4 デプロイ実績（2026-10-17）** — Railway project `EC-Portfolio2`（R3 の `EC-Portfolio` は比較用に残す）
> - frontend: `https://frontend-production-e5f4e.up.railway.app` / backend: `https://backend-production-e912a.up.railway.app`（どちらも domain target port 8080）
> - queue / scheduler / Postgres 18 / bucket `ec-portfolio2-media-jrkym2`（region sin）は内部のみ。サービスの region は R3 と同じ sfo
> - 5 サービスとも GitHub `kabochan73/EC-Portfolio2` の main に接続。Root Directory は backend 系 `/backend`・frontend `/frontend`、Watch Paths で自分のディレクトリが変わったときだけ再デプロイ
> - Stripe は test モード。R4 用の Webhook エンドポイントを Stripe CLI で作成（`stripe webhook_endpoints create`）。Stripe / Resend のキーは R3 からコピー、`APP_KEY` と `BFF_SHARED_SECRET` は新規
> - 管理者は `ADMIN_*`（Railway Variables のみ）。初期データは `railway ssh -i <鍵> --service backend "php artisan db:seed --force"` → `--class=DemoOrderSeeder --force`
> - **R4 で踏んだ罠**: CLI の `railway environment edit --service-config` で source / rootDirectory を入れても「No changes to apply」で反映されなかった → MCP の `update_service`（root directory・Dockerfile・watch patterns・start command）と `connect_service_source` で設定。`railway ssh` は手元の鍵を順に試して失敗することがある → `-i` で Railway に登録済みの鍵を指定。`resend/resend-php` が入っておらずメールのジョブが `Class "Resend" not found` で失敗（R3 はデプロイ後に追加していた）→ composer require
> - デモ注文（売上ダッシュボード用）は月が変わると「今月」が空になるので、見せる前に `DemoOrderSeeder` を流し直す

> **R3 デプロイ実績（2026-09-08）** — Railway project `EC-Portfolio`
> - frontend: `https://frontend-production-af2f.up.railway.app`（domain target port **8080**。Railway が `PORT` を注入し Next がそれで listen するため）
> - backend: `https://backend-production-6d3d.up.railway.app`（serversideup、port 8080）
> - queue / Postgres / bucket `ec-portfolio-media-6b21n`（region sin）は内部のみ
> - **Stripe は test モードのまま**（live キー不使用）。webhook エンドポイントは test モードで作成し `whsec_` を backend に設定
> - **Resend 導入済み（2026-09-09）** → `MAIL_MAILER=resend` + `RESEND_API_KEY`。ドメイン未検証なので送信元は `onboarding@resend.dev`（Resend の制約で **アカウント所有者のメール宛にしか届かない** = デモでは自分で登録する分は届く）。独自ドメインを検証すれば誰にでも送れる
> - **frontend の `API_URL` = backend 公開 URL**（`railway.internal` はビルド時に解決不可。ISR プリレンダーが `next build` 中に Laravel を叩くため）
>
> **デプロイで踏んだ罠**
> - `railway up` は git ルートを基準にアーカイブする → サブディレクトリからは `railway up . --path-as-root --service <name>` で当該ディレクトリをルートにする
> - `.dockerignore` に `Dockerfile` を入れると Railway がビルダを検出できず Railpack に落ちる → 除外しない。加えて `railway.json`（`builder: DOCKERFILE`）を各サービスに置く
> - `CACHE_STORE=database` + `AUTORUN_LARAVEL_MIGRATION_ISOLATION=true` は初回起動で詰む（isolation が `cache_locks` テーブルを要求するが migration 前で存在しない）→ 単一インスタンスなら **isolation=false**
> - 初回のカタログは build 時プリレンダーが seed 前で空になる → seed 後に管理画面から1回編集（`revalidateTag`）するか、`revalidate` 秒で自然回復
> - seed は `railway ssh --service backend "php artisan db:seed --force"`（`railway run` は内部 DB に届かない）

## サービス構成

| サービス | 中身 | 公開 | ポート |
|---|---|---|---|
| `frontend` | Next.js（standalone 出力）を Dockerfile でビルド | ✅ 公開ドメイン | Railway が渡す `PORT`（8080）。ドメインの target port も 8080 |
| `backend` | Laravel。`serversideup/php:8.4-fpm-nginx` を薄い Dockerfile でラップ | ✅ 公開ドメイン（理由は下記） | 8080 |
| `queue` | 同じ backend イメージを `php artisan queue:work` で起動 | 内部のみ | - |
| `scheduler` | 同じ backend イメージを `php artisan schedule:work` で起動（期限切れ注文のキャンセル等。`routes/console.php`） | 内部のみ | - |
| `Postgres` | Railway の PostgreSQL（18） | 内部のみ | 5432 |
| bucket | Railway Storage Bucket（S3 互換、private）。商品・CMS 画像 | 内部（S3 API） | - |

5 サービスとも GitHub の main に接続し、push で自動デプロイ。Root Directory は backend / queue / scheduler が `/backend`、frontend が `/frontend`。Watch Paths（`/backend/**` / `/frontend/**`）で、自分のディレクトリが変わったときだけ再デプロイする（`docs/` だけの変更ではデプロイしない）。

### backend を公開する理由

1. **Stripe Webhook**: Stripe から `POST /api/stripe/webhook` を直接受ける必要がある（署名検証で保護。署名不正は 400。`throttle:60,1`）
2. **frontend のビルド**: `next build` がトップページなどをビルド時に作る（ISR）ときに Laravel を呼ぶ。Railway の内部 DNS（`*.railway.internal`）はビルド時に引けないので、frontend の `API_URL` は backend の**公開 URL**にしている（実行時の呼び出しも同じ URL）

それ以外の API はブラウザから直接呼んでも、Cookie（トークン）が無いので 401。ブラウザが話す相手は Next.js（BFF）だけなので、CORS の設定は持たない（`config/cors.php` は無く Laravel の初期設定のまま）。

`serversideup/php` は nginx + php-fpm を s6-overlay で1コンテナにまとめた本番向けイメージ。opcache / php-fpm チューニング済み・非root・healthcheck 付き。`8.4-fpm-nginx` 同梱拡張は `pdo_pgsql` `redis` `opcache` `zip` `mbstring` `curl` `sodium` など。**`intl` / `gd` / `bcmath` は非同梱**。R4 でも未使用（画像リサイズはしない、金額は integer 演算のみ）。

## queue / scheduler サービス

- backend と**同じイメージ**（同じ Dockerfile・Root Directory）で、Start Command だけ上書きする。Restart Policy は ALWAYS
  - queue: `php artisan queue:work --tries=3 --sleep=3 --max-time=3600`
  - scheduler: `php artisan schedule:work`
- `AUTORUN_ENABLED=false`（migrate / config:cache は backend が起動時に 1 回やる）。変数は backend と同じセット
- queue のジョブ: メール 3 種（注文確認・発送通知・パスワードリセット。`docs/10`）。失敗は `failed_jobs`。`php artisan queue:retry all` で再実行。worker が落ちてもメールが遅延するだけ
- scheduler が実行するもの: `orders:expire-pending`（5 分ごと。30 分を過ぎた未決済注文をキャンセルして在庫を戻す）/ `sanctum:prune-expired`（毎日）。止まっても決済・注文は動く（未決済注文の在庫が戻らないだけ。admin が手動でキャンセルできる）

## リポジトリ構成

```
EC-Portfolio2/
├── docker-compose.yml        # ローカル開発（全サービス。docs/07）
├── .github/workflows/ci.yml  # CI（Pint + Pest / tsc + lint + Vitest）
├── frontend/
│   ├── Dockerfile            # 本番用（multi-stage, standalone）
│   ├── Dockerfile.dev        # ローカル用（next dev）
│   └── railway.json          # builder = DOCKERFILE
├── backend/
│   ├── Dockerfile            # 本番用（FROM serversideup/php の薄いラッパ。backend / queue / scheduler 共用）
│   └── railway.json
└── docs/
```

## 環境変数

値はすべて Railway の Variables にだけ書く（リポジトリには入れない）。

### frontend
| 変数 | 値（本番） | 用途 |
|---|---|---|
| `API_URL` | backend の**公開 URL**（`https://<backend>.up.railway.app`） | サーバー側から Laravel を呼ぶ。ビルド時のプリレンダーでも使う（Railway がビルド引数としても渡す） |
| `BUCKET_ENDPOINT` / `BUCKET_ACCESS_KEY_ID` / `BUCKET_SECRET_ACCESS_KEY` / `BUCKET_NAME` / `BUCKET_REGION` | `railway bucket credentials` の値 | `/media` プロキシの GetObject |
| `BUCKET_FORCE_PATH_STYLE` | `false`（Railway のバケットはバーチャルホスト形式） | 未設定はローカル（RustFS）向けの `true` |
| `BFF_SHARED_SECRET` | backend と同じ値 | 登録・ログイン・パスワードリセットで、本当のクライアント IP（Railway エッジの `X-Real-IP`）を backend に渡す |
| `NODE_ENV` | `production` | |

`NEXT_PUBLIC_*` は使っていない（Stripe の publishable key は `/api/checkout/payment-intent` のレスポンスで受け取る）。

### backend（`queue` / `scheduler` も同じセット）
| 変数 | 値 | 用途 |
|---|---|---|
| `APP_NAME` | `EC-PORTFOLIO` | ヘルス応答・メール表示名 |
| `APP_KEY` | `base64:...`（`php artisan key:generate --show`） | |
| `APP_ENV` / `APP_DEBUG` | `production` / `false` | |
| `APP_LOCALE` / `APP_FALLBACK_LOCALE` | `ja` / `en` | |
| `APP_URL` | backend 公開ドメイン | |
| `FRONTEND_URL` | frontend 公開ドメイン | メール内リンク（注文詳細・パスワードリセット）の base |
| `DB_CONNECTION` | `pgsql` | |
| `DB_URL` | `${{Postgres.DATABASE_URL}}`（参照変数） | |
| `DB_SSLMODE` | `prefer` | |
| `LOG_CHANNEL` | `stderr` | Railway ログ |
| `SESSION_DRIVER` | `array` | セッション不使用（トークン認証） |
| `CACHE_STORE` / `QUEUE_CONNECTION` | `database` / `database` | Redis なし |
| `SSL_MODE` | `off` | serversideup。TLS は Railway エッジ終端 |
| `PHP_OPCACHE_ENABLE` | `1` | 本番は opcache 有効 |
| `AUTORUN_ENABLED` | `true`（backend）/ `false`（queue・scheduler） | |
| `AUTORUN_LARAVEL_MIGRATION` | `true`（backend のみ） | 起動時 `migrate --force` |
| `AUTORUN_LARAVEL_MIGRATION_ISOLATION` | **`false`** | `true` + `CACHE_STORE=database` は初回起動で詰む（`cache_locks` が migrate 前に要る。R3 の罠）。単一インスタンスなので不要 |
| `AUTORUN_LARAVEL_CONFIG_CACHE` / `ROUTE_CACHE` / `EVENT_CACHE` | `true`（backend のみ） | |
| `AUTORUN_LARAVEL_STORAGE_LINK` | `false` | S3 配信なので不要 |
| `FILESYSTEM_DISK` | `s3` | 画像を Railway バケットへ |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_DEFAULT_REGION` / `AWS_BUCKET` / `AWS_ENDPOINT` | `railway bucket credentials` の値 | 2026-11-02 にシークレットが食い違って 403 になった。直し方は冒頭の R4 実績 |
| `AWS_USE_PATH_STYLE_ENDPOINT` | `false` | |
| `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` | `sk_test_...` / `pk_test_...`（**test のまま**） | publishable は `/api/checkout/payment-intent` のレスポンスに載せる |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...`（**test モードの Webhook エンドポイント**のもの） | Webhook 署名検証 |
| `MAIL_MAILER` / `RESEND_API_KEY` | `resend` / `re_...` | queue の SendXxxJob が使う（`resend/resend-php` が必要） |
| `MAIL_FROM_ADDRESS` / `MAIL_FROM_NAME` | `onboarding@resend.dev` / `EC-PORTFOLIO` | ドメイン未検証のため Resend の共有ドメイン |
| `BFF_SHARED_SECRET` | `openssl rand -hex 32`（frontend と同じ値） | BFF が渡す実クライアント IP（`X-Client-IP`）を信用するための共有シークレット。IP 単位のレート制限用 |
| `ADMIN_NAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` | 管理者 | `AdminUserSeeder` が読む |

## デプロイ時のマイグレーションと初期データ

serversideup の Laravel Automations（`AUTORUN_*`）に任せる。backend サービス起動時に:
```
php artisan migrate --force
php artisan config:cache && route:cache && event:cache
```
- `db:seed` は AUTORUN に無い。初期データは手動（`railway run` は内部 DB に届かないので ssh。鍵は `-i` で指定）:
  - `railway ssh -i ~/.ssh/<Railway に登録した鍵> --service backend "php artisan db:seed --force"`（初回のみ）
  - `railway ssh -i ... --service backend "php artisan db:seed --class=DemoOrderSeeder --force"`（売上ダッシュボード用。月が変わったら流し直す）
- 初回のトップページは、seed の**後**に frontend をデプロイする（ビルド時のプリレンダーが空になるのを避ける）
- queue / scheduler は AUTORUN 全 false。backend の migrate より先に起動しても、`--tries` と restart で吸収される

## Stripe Webhook 登録

ダッシュボードでも Stripe CLI でも作れる（R4 は CLI）:
```
stripe webhook_endpoints create --url https://<backend 公開ドメイン>/api/stripe/webhook \
  -d "enabled_events[]=payment_intent.succeeded" -d "enabled_events[]=payment_intent.payment_failed" \
  -d "enabled_events[]=payment_intent.canceled" -d "enabled_events[]=charge.refunded"
```
返ってきた `secret`（`whsec_...`）を backend / queue / scheduler の `STRIPE_WEBHOOK_SECRET` に設定。ローカルは `stripe listen --forward-to localhost:8000/api/stripe/webhook`（`docs/07` / `docs/09`）。

## Resend（メール本番）

- 独自ドメインは取らない（費用がかかるため。2026-10-17 ユーザーの判断）。送信元は Resend の共有ドメイン `onboarding@resend.dev` で、**アカウント所有者のアドレスにしか届かない**
- `composer require resend/resend-php` が必要（R4 は入れ忘れて本番でメールのジョブが失敗した。2026-10-17 に追加）
- 独自ドメインを使う場合は、Resend にドメインを追加して DNS（SPF / DKIM）を検証し、`MAIL_FROM_ADDRESS` をそのドメインのアドレスにする

## Dockerfile

- `backend/Dockerfile`: `serversideup/php:8.4-fpm-nginx` + `composer install --no-dev --optimize-autoloader`。CMD は上書きしない（nginx(8080) と php-fpm は s6-overlay が起動）。queue / scheduler は Railway の Start Command で上書き
- `frontend/Dockerfile`: deps → build → run の 3 段（standalone）。`ARG API_URL` をビルド時に渡す。`public/` が空でも run 段の COPY が落ちないよう `mkdir -p public`
- `.dockerignore` に `Dockerfile` を入れない（Railway がビルダを検出できず Railpack に落ちる。R3 の罠）。`railway.json` で `builder: DOCKERFILE` も指定

## 本番とローカルの差分

| | ローカル | 本番（Railway） |
|---|---|---|
| backend / queue / scheduler イメージ | serversideup を直接 + マウント | 同イメージにコード焼き込み |
| opcache | 0 | 1 |
| 起動時 artisan | 手動 | `AUTORUN_*`（backend のみ） |
| frontend | `next dev` | `node server.js`（standalone） |
| PostgreSQL | 16 | 18 |
| 画像 | RustFS（パス形式） | Railway バケット（バーチャルホスト形式） |
| メール | Mailpit（SMTP） | Resend |
| Stripe webhook | `stripe listen` が転送 | Stripe → backend 公開 URL 直 |
