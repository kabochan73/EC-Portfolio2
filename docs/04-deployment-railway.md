# デプロイ構成（Railway + Docker）（R4）

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
| `frontend` | Next.js（standalone 出力）を Dockerfile でビルド | ✅ 公開ドメイン | 3000 |
| `backend` | Laravel。`serversideup/php:8.4-fpm-nginx` を薄い Dockerfile でラップ | ⚠️ 公開ドメインあり（ただし `/api/stripe/webhook` 以外は CORS/BFF 前提。下記） | 8080 |
| `queue` | 同じ backend イメージを `php artisan queue:work` で起動（**R3 追加**） | 内部のみ | - |
| `scheduler` | 同じ backend イメージを `php artisan schedule:work` で起動（期限切れ注文のキャンセル等。`routes/console.php`） | 内部のみ | - |
| `postgres` | Railway の PostgreSQL | 内部のみ | 5432 |
| `bucket` | Railway Storage Bucket（S3互換、private）。商品・CMS 画像 | 内部（S3 API） | - |

### backend の公開について（R3 の変更点）

R2 は「backend に公開ドメインを付けない（BFF のため不要）」だった。R3 は **Stripe Webhook が backend を直接叩く必要がある**ため、backend にも公開ドメインを付ける。攻撃面を絞るための対策:

- 公開されるのは実質 `POST /api/stripe/webhook` のみ意味を持つ（他は BFF 経由前提で、ブラウザから直接呼んでも Cookie が無く 401、CORS は `FRONTEND_URL` のみ許可）
- `/api/stripe/webhook` は署名検証（`STRIPE_WEBHOOK_SECRET`）で保護。署名不正は 400
- レートリミット（Laravel の `throttle`）を webhook にも軽くかける（`throttle:60,1` 程度。Stripe の再送を邪魔しない範囲）
- frontend → backend の内部通信は従来どおり `backend.railway.internal:8080`（公開ドメインは経由しない）

`serversideup/php` は nginx + php-fpm を s6-overlay で1コンテナにまとめた本番向けイメージ。opcache / php-fpm チューニング済み・非root・healthcheck 付き。`8.4-fpm-nginx` 同梱拡張は `pdo_pgsql` `redis` `opcache` `zip` `mbstring` `curl` `sodium` など。**`intl` / `gd` / `bcmath` は非同梱**。R3 でも未使用（画像リサイズはしない、金額は integer 演算のみ）。

## queue worker サービス（R3 追加）

- backend と**同じイメージ**をデプロイし、起動コマンドだけ `php artisan queue:work --tries=3 --max-time=3600 --sleep=3` に差し替える
- Railway では backend サービスを複製して「Custom Start Command」を設定、または `backend/` に `worker` 用の compose/Procfile を持たせる。R3 は **Railway 上で backend サービスを複製し start command を上書き**する運用（Dockerfile は共通）
- `AUTORUN_*` は queue サービスでは **false**（migrate/config:cache は backend 側が起動時に1回やる。worker が重複して走らせない）
- ジョブ: 4 種のメール送信（`docs/10`）。失敗は `failed_jobs` に落ちる。`php artisan queue:retry all` で再実行
- worker が落ちてもリクエスト処理には影響しない（メールが遅延するだけ）。Railway の restart policy に任せる

## scheduler サービス

- queue と同じ作り方で、Start Command を `php artisan schedule:work` にする。`AUTORUN_*` は false、変数は backend と同じセット
- 実行するもの（`routes/console.php`）: `orders:expire-pending`（5分ごと。30分を過ぎた未決済注文をキャンセルして在庫を戻す）/ `sanctum:prune-expired`（毎日）
- 止まっても決済・注文自体は動く。未決済注文の在庫が戻らなくなるだけ（admin が手動キャンセルできる）

## リポジトリ構成

```
EC-Portfolio/
├── docker-compose.yml        # ローカル開発（全サービス。docs/07）
├── frontend/
│   ├── Dockerfile            # 本番用（multi-stage, standalone）
│   ├── Dockerfile.dev        # ローカル用（next dev）
│   └── ...
├── backend/
│   ├── Dockerfile            # 本番用（FROM serversideup/php の薄いラッパ。backend / queue 共用）
│   └── ...
└── docs/
```

Railway では各サービスの Root Directory を `frontend` / `backend` に設定。`queue` は `backend` を Root Directory にして Start Command を上書き。

## 環境変数

### frontend
| 変数 | 値（本番） | 用途 |
|---|---|---|
| `API_URL` | backend の**公開 URL**（`https://<backend>.up.railway.app`） | サーバー側から Laravel を呼ぶ。ビルド時のプリレンダーでも使う（内部 DNS はビルド時に解決不可） |
| `NEXT_PUBLIC_SITE_URL` | frontend 公開ドメイン | 絶対URL生成 |
| `BUCKET_ENDPOINT` / `BUCKET_ACCESS_KEY_ID` / `BUCKET_SECRET_ACCESS_KEY` / `BUCKET_NAME` / `BUCKET_REGION` | `${{Bucket.*}}` | `/media` プロキシの GetObject |
| `NODE_ENV` | `production` | |
| `BFF_SHARED_SECRET` | backend と同じ値 | 登録・ログイン・パスワードリセットで `X-Real-IP`（Railway エッジが付与）を backend に渡す |

### backend（`queue` サービスも同じセットを共有）
| 変数 | 値 | 用途 |
|---|---|---|
| `APP_KEY` | `base64:...`（`php artisan key:generate --show`） | |
| `APP_ENV` | `production` | |
| `APP_DEBUG` | `false` | |
| `APP_URL` | backend 公開ドメイン | 署名 URL・メールリンクの base |
| `FRONTEND_URL` | frontend 公開ドメイン | CORS 許可元・メール内リンクの base |
| `DB_CONNECTION` | `pgsql` | |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` | |
| `LOG_CHANNEL` | `stderr` | Railway ログ |
| `SESSION_DRIVER` | `array` | セッション不使用（トークン認証） |
| `CACHE_STORE` | `database` | Redis なし |
| `QUEUE_CONNECTION` | `database` | jobs テーブル |
| `SSL_MODE` | `off` | serversideup。TLS は Railway エッジ終端 |
| `PHP_OPCACHE_ENABLE` | `1` | 本番は opcache 有効 |
| `AUTORUN_ENABLED` | `true`（backend）/ `false`（queue） | |
| `AUTORUN_LARAVEL_MIGRATION` | `true`（backend のみ） | 起動時 `migrate --force` |
| `AUTORUN_LARAVEL_MIGRATION_ISOLATION` | `true` | 多重起動時に1つだけ migrate |
| `AUTORUN_LARAVEL_CONFIG_CACHE` / `ROUTE_CACHE` / `EVENT_CACHE` | `true`（backend のみ） | |
| `AUTORUN_LARAVEL_STORAGE_LINK` | `false` | S3 配信なので不要 |
| `FILESYSTEM_DISK` | `s3` | 画像を Railway バケットへ |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_DEFAULT_REGION` / `AWS_BUCKET` / `AWS_ENDPOINT` | `${{Bucket.*}}` | |
| `AWS_USE_PATH_STYLE_ENDPOINT` | バケットの Credentials タブの指示に従う | |
| `APP_NAME` | `EC-PORTFOLIO` | ヘルス応答・メール表示名 |
| `STRIPE_SECRET_KEY` | `sk_test_...`（**test のまま**） | stripe-php |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...`（**test モードの Webhook エンドポイント**のもの） | Webhook 署名検証 |
| `STRIPE_PUBLISHABLE_KEY` | `pk_test_...` | `/api/checkout/payment-intent` のレスポンスに載せる（フロントの Payment Element 初期化に使う） |
| `MAIL_MAILER` | `resend` | queue の SendXxxJob がメール送信に使う |
| `RESEND_API_KEY` | `re_...` | Resend API キー |
| `MAIL_FROM_ADDRESS` | `onboarding@resend.dev` | ドメイン未検証のため Resend 共有。検証後は `noreply@<ドメイン>` |
| `MAIL_FROM_NAME` | `EC-PORTFOLIO` | |
| `BFF_SHARED_SECRET` | `openssl rand -hex 32`（frontend と同じ値） | BFF が渡す実クライアント IP（`X-Client-IP`）を信用するための共有シークレット。IP 単位のレート制限用 |

## デプロイ時のマイグレーション

serversideup の Laravel Automations（`AUTORUN_*`）に任せる。backend サービス起動時に:
```
php artisan migrate --force
php artisan config:cache && route:cache && event:cache
```
- `db:seed` は AUTORUN に無い。初期データは手動: `railway run php artisan db:seed --force`（初回のみ）
- `queue` サービスは AUTORUN 全 false。backend が先に上がる保証は無いので、`migrate` の完了前に worker が起動しても `--tries` と restart で吸収される

## Stripe Webhook 登録

1. Stripe ダッシュボード → Developers → Webhooks → Add endpoint
2. URL: `https://<backend 公開ドメイン>/api/stripe/webhook`
3. イベント: `payment_intent.succeeded` / `payment_intent.payment_failed` / `payment_intent.canceled` / `charge.refunded`
4. 表示される `whsec_...` を `STRIPE_WEBHOOK_SECRET` に設定
5. ローカルは `stripe listen --forward-to localhost:8000/api/stripe/webhook`（`docs/07` / `docs/09`）

## Resend（メール本番）

- Resend にドメインを追加し DNS（SPF / DKIM）を検証（キー入手後の作業。それまでは `MAIL_MAILER=log` でも動く）
- 無料枠内・自分宛のテストのみ（ポートフォリオなので実顧客はいない）
- `MAIL_FROM_ADDRESS` は検証済みドメインのアドレス

## backend/Dockerfile 方針

```dockerfile
FROM serversideup/php:8.4-fpm-nginx
USER www-data
COPY --chown=www-data:www-data . /var/www/html
RUN composer install --no-dev --optimize-autoloader --no-interaction --prefer-dist
# nginx(8080) と php-fpm は s6-overlay が起動。CMD は上書きしない（backend）
# queue サービスは Railway 側で Start Command を
#   php artisan queue:work --tries=3 --max-time=3600
# に上書きする
```

## frontend/Dockerfile 方針（Next.js standalone）

```dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build
FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

`NEXT_PUBLIC_*` はビルド時に埋め込まれる。Railway の build 環境変数に `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` / `NEXT_PUBLIC_SITE_URL` を設定しておく。

## 本番と ローカルの差分

| | ローカル | 本番（Railway） |
|---|---|---|
| backend / queue イメージ | serversideup を直接 + マウント | 同イメージにコード焼き込み |
| opcache | 0 | 1 |
| 起動時 artisan | 手動 | `AUTORUN_*`（backend のみ） |
| frontend | `next dev` | `next start`（standalone） |
| メール | Mailpit（SMTP） | Resend |
| Stripe webhook | `stripe listen` が転送 | Stripe → backend 公開 URL 直 |
