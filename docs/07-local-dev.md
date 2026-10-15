# ローカル開発環境（すべて Docker）（R4）

## 方針

- **`docker compose up -d` だけで開発環境が全部立ち上がる。** frontend / backend / queue / db / rustfs / mailpit をすべてコンテナで動かす。
- ホストに PHP / Composer / artisan を入れない。`php artisan serve` も `npm run dev` もホストでは打たない。
- **例外**: frontend の `node_modules` だけはホストにも入れる（`cd frontend && npm ci`。IDE の TS サーバー / ESLint 用）。ホストの Node は `.nvmrc` の 22。
- artisan / composer / npm / pint / pest はすべて `docker compose exec` 経由。
- ソースはバインドマウント（コード編集は即反映）。
- backend / queue はローカルも本番も同じイメージ `serversideup/php:8.4-fpm-nginx`。

## サービス一覧

| サービス | イメージ / ビルド | 役割 | ホスト公開ポート |
|---|---|---|---|
| `frontend` | `frontend/Dockerfile.dev`（node:22-alpine） | `next dev`（ホットリロード） | `3000` |
| `backend` | `serversideup/php:8.4-fpm-nginx` | Laravel。nginx + php-fpm。artisan の実行先 | `8000`（→ 8080） |
| `queue` | `serversideup/php:8.4-fpm-nginx`（`command` 上書き） | `php artisan queue:work`。メール送信ジョブを処理 | なし |
| `scheduler` | `serversideup/php:8.4-fpm-nginx`（`command` 上書き） | `php artisan schedule:work`。未決済注文の期限切れキャンセル等（R3 後期に追加） | なし |
| `db` | `postgres:16-alpine` | PostgreSQL 16 | `5432` |
| `rustfs` | `rustfs/rustfs` | S3 互換ストレージ（旧 MinIO。公式イメージが取得不可になり 2026-10 に置き換え） | `9000` / `9001`（コンソールは `/rustfs/console/`） |
| `createbuckets` | `amazon/aws-cli` | 起動時に一度だけ `ec-portfolio-media` を作る使い捨て | なし |
| `mailpit` | `axllent/mailpit` | ローカルの SMTP 受信箱。送信メールをここで確認（**R3 追加**） | `8025`（Web UI） |

コンテナ名は `ecp4-<サービス名>`、ボリュームは `ecp4-*`（R4。R3 の `ecp-*` と衝突させない）。公開ポートは R3 と同じなので、**R4 を起動する前に R3 を `docker compose down` する**。

### 通信経路

```
ブラウザ
  → localhost:3000  ── frontend コンテナ（next dev）
        │ サーバー側 fetch（BFF）
        ▼
     http://backend:8080 ── backend コンテナ（nginx → php-fpm → Laravel）
        ├─→ db:5432
        ├─→ rustfs:9000
        └─→ mailpit:1025（SMTP）
     queue コンテナ ──→ db:5432 / mailpit:1025（jobs を pull してメール送信）

Stripe Webhook（ローカル）:
  stripe CLI（ホスト or コンテナ）  ──→  localhost:8000/api/stripe/webhook
```

- ブラウザが直接触るのは `localhost:3000` だけ（BFF）。`localhost:8000` は curl / Stripe CLI / Laravel Boost MCP 用。
- frontend コンテナからは `API_URL=http://backend:8080`。

## queue サービス（R3 追加）

```yaml
queue:
  image: serversideup/php:8.4-fpm-nginx
  container_name: ecp4-queue
  command: ["php", "artisan", "queue:work", "--tries=3", "--sleep=3", "--max-time=3600"]
  volumes:
    - ./backend:/var/www/html
  environment:
    SSL_MODE: "off"
    AUTORUN_ENABLED: "false"
  env_file: ./backend/.env
  depends_on:
    db: { condition: service_healthy }
    mailpit: { condition: service_started }
```

- コード変更でジョブの挙動を変えたら `docker compose restart queue`（worker はプロセス起動時にコードを読む）
- ジョブが詰まったら `docker compose exec backend php artisan queue:failed` / `queue:retry all`

## mailpit サービス（R3 追加）

```yaml
mailpit:
  image: axllent/mailpit:latest
  container_name: ecp4-mailpit
  ports:
    - "8025:8025"   # Web UI（http://localhost:8025）
  environment:
    MP_MAX_MESSAGES: "500"
    MP_SMTP_AUTH_ACCEPT_ANY: "1"
    MP_SMTP_AUTH_ALLOW_INSECURE: "1"
```

`backend/.env`:
```
MAIL_MAILER=smtp
MAIL_HOST=mailpit
MAIL_PORT=1025
MAIL_USERNAME=null
MAIL_PASSWORD=null
MAIL_ENCRYPTION=null
MAIL_FROM_ADDRESS="noreply@ec-portfolio.example.jp"
MAIL_FROM_NAME="EC-PORTFOLIO"
```

送信したメールはすべて Mailpit UI（http://localhost:8025）で確認する。実際には誰にも届かない。

## backend — Dockerfile なし（ローカル）

`serversideup/php:8.4-fpm-nginx` を compose の `image:` で直接指定。nginx.conf も php-fpm.conf も書かない。webroot は `/var/www/html/public`。

```yaml
backend:
  image: serversideup/php:8.4-fpm-nginx
  volumes:
    - ./backend:/var/www/html
  environment:
    SSL_MODE: "off"
    PHP_OPCACHE_ENABLE: "0"
    AUTORUN_ENABLED: "false"
    PHP_FPM_POOL_NAME: "ecp"
  env_file: ./backend/.env
  ports: ["8000:8080"]
  depends_on:
    db: { condition: service_healthy }
    rustfs: { condition: service_healthy }
    mailpit: { condition: service_started }
```

拡張: `pdo_pgsql` `redis` `opcache` `zip` `mbstring` は同梱。`intl` / `gd` / `bcmath` は非同梱（R3 でも未使用）。

## frontend/Dockerfile.dev

```dockerfile
FROM node:22-alpine
WORKDIR /app
CMD ["sh", "-c", "npm install && npm run dev"]
```

Mac（Docker Desktop）向けに polling: `WATCHPACK_POLLING=true` / `CHOKIDAR_USEPOLLING=true`。

## ボリューム設計

| 対象 | やり方 | 理由 |
|---|---|---|
| `./backend` → `/var/www/html` | バインドマウント | PHP のコード編集を即反映（backend / queue で共有） |
| `/var/www/html/vendor` | バインドマウント（ホストにも置く） | IDE 補完。重ければ名前付きボリュームに逃がす |
| `./frontend` → `/app` | バインドマウント | Next のコード編集を即反映 |
| `/app/node_modules` | 名前付きボリューム | OS 差回避。ホストの node_modules で上書きさせない |
| `/app/.next` | 名前付きボリューム | ビルドキャッシュを速く |
| db / rustfs のデータ | 名前付きボリューム | `down` してもデータを残す |

## 環境変数（ローカル）

### backend/.env（要点）

| 変数 | 値 |
|---|---|
| `APP_URL` | `http://localhost:8000` |
| `FRONTEND_URL` | `http://localhost:3000` |
| `DB_CONNECTION` | `pgsql` |
| `DB_HOST` | `db` |
| `DB_PORT` | `5432` |
| `DB_DATABASE` / `DB_USERNAME` / `DB_PASSWORD` | `ecp` / `ecp` / `ecpsecret` |
| `CACHE_STORE` | `database` |
| `QUEUE_CONNECTION` | `database` |
| `SESSION_DRIVER` | `array` |
| `FILESYSTEM_DISK` | `s3` |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | `ecp` / `ecpsecret` |
| `AWS_DEFAULT_REGION` | `us-east-1` |
| `AWS_BUCKET` | `ec-portfolio-media` |
| `AWS_ENDPOINT` | `http://rustfs:9000` |
| `AWS_USE_PATH_STYLE_ENDPOINT` | `true` |
| `MAIL_MAILER` | `smtp` |
| `MAIL_HOST` / `MAIL_PORT` | `mailpit` / `1025` |
| `STRIPE_SECRET_KEY` | `sk_test_...`（未入手なら空でも起動はする。決済フローを触るときに設定） |
| `STRIPE_PUBLISHABLE_KEY` | `pk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...`（`stripe listen` が表示する値） |

### frontend/.env.local（要点）

| 変数 | 値 |
|---|---|
| `API_URL` | `http://backend:8080` |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_...` |
| `BUCKET_ENDPOINT` | `http://rustfs:9000` |
| `BUCKET_ACCESS_KEY_ID` / `BUCKET_SECRET_ACCESS_KEY` | `ecp` / `ecpsecret` |
| `BUCKET_NAME` | `ec-portfolio-media` |
| `BUCKET_REGION` | `us-east-1` |

## 初回セットアップ

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

docker compose up -d --build

docker compose exec backend composer install
docker compose exec backend php artisan key:generate
docker compose exec backend php artisan migrate --seed

cd frontend && npm ci    # ホスト。IDE 補完・型チェック用
```

## Stripe（ローカル）

決済フローを触るとき:

```bash
# Stripe CLI をホストに入れる（brew install stripe/stripe-cli/stripe）か docker で
stripe login
stripe listen --forward-to localhost:8000/api/stripe/webhook
#   → 表示される whsec_... を backend/.env の STRIPE_WEBHOOK_SECRET に入れて docker compose restart backend queue

# 別ターミナルで疑似イベント
stripe trigger payment_intent.succeeded
```

テストカード: `4242 4242 4242 4242` / 任意の未来の有効期限 / 任意の CVC。3DS テスト: `4000 0025 0000 3155`。

`STRIPE_*` が未設定でもアプリは起動する（決済ページに行くまでエラーにならないよう `CreatePaymentIntent` でキー未設定を 503 で返す）。

## よく使うコマンド

```bash
docker compose up -d
docker compose down            # データは残る
docker compose down -v         # データごと破棄
docker compose logs -f backend # backend / frontend / queue

docker compose exec backend php artisan migrate
docker compose exec backend php artisan test           # Pest
docker compose exec backend ./vendor/bin/pint --dirty
docker compose exec backend php artisan tinker
docker compose exec backend php artisan queue:work --once
docker compose exec backend php artisan queue:failed

docker compose exec frontend npm run lint
docker compose exec frontend npx tsc --noEmit
```

## Laravel Boost（MCP）

```json
{
  "mcpServers": {
    "laravel-boost": {
      "command": "docker",
      "args": ["compose", "exec", "-T", "backend", "php", "artisan", "boost:mcp"]
    }
  }
}
```

`-T` が無いと MCP の stdio がおかしくなる。コンテナが起動している必要がある。

## トラブルシュート

| 症状 | 対処 |
|---|---|
| frontend のファイル変更が反映されない | polling env を確認。`docker compose restart frontend` |
| `.tsx` 全体が「`react` が見つからない」 | ホストに `node_modules` が無い。`cd frontend && npm ci` |
| `vendor` が無い | `docker compose exec backend composer install` |
| `could not translate host name "db"` | `.env` の `DB_HOST=db`（`127.0.0.1` はコンテナ自身） |
| backend が 502 | `docker compose logs backend`。`APP_KEY` 未設定 / `storage/` 権限 |
| メールが届かない | Mailpit UI（:8025）を見る。`queue` コンテナが起動しているか。`queue:failed` |
| Webhook が来ない | `stripe listen` が起動しているか。`STRIPE_WEBHOOK_SECRET` が listen の表示値と一致し、restart 済みか |
| RustFS に接続できない | `AWS_ENDPOINT=http://rustfs:9000` と `AWS_USE_PATH_STYLE_ENDPOINT=true` |
| ポート衝突（5432 / 8025） | ホストの別サービスを止めるか compose の公開ポートを変える |

## 本番との差分

| | ローカル | 本番（Railway） |
|---|---|---|
| backend / queue イメージ | serversideup を直接 + マウント | 同イメージにコード焼き込み |
| opcache | 0 | 1 |
| 起動時 artisan | 手動 | `AUTORUN_*`（backend のみ） |
| frontend | `next dev` | `next start`（standalone） |
| メール | Mailpit（SMTP） | Resend（`MAIL_MAILER=resend`） |
| Stripe webhook | `stripe listen` が転送 | Stripe → backend 公開 URL 直 |
| キュー | `queue` コンテナ | Railway の queue サービス（backend 複製 + Start Command 上書き） |
