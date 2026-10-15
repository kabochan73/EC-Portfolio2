# EC-Portfolio — プロジェクト概要（R4）

架空のミニマル・アパレルブランドの EC サイト。ポートフォリオ用に作り直してブラッシュアップする取り組みの **4回目（R4）**。

- R1 = `../../ec1/`（環境構築で停止。`/admin`・`/media`・本番デプロイ・テストが未完）
- R2 = `../../ec2/`（機能はほぼ完成。カタログ / カート / 認証 / 住所録 / チェックアウト（決済なし）/ マイページ / 管理画面が動く。未達 = 本番デプロイ・自動テスト・決済・メール・ISR・CMS）
- R3 = `../../EC-Portfolio/`（完成・Railway で本番稼働中。R4 の答え合わせ用の参照実装）

## R4 のゴール

R3 と同じスコープ・同じ技術スタックを、**自分の手で 1 から書き直して理解する**。R3 からの機能追加は 1 つだけ。

| R4 で新たに入れるもの | 概要 |
|---|---|
| 売上ダッシュボード | 管理画面 `/admin` に売上 KPI・棒グラフ（日別/月別）・カテゴリ別の商品ランキングを表示。詳細は `docs/05-admin.md` |

以下の「R3 のゴール」以降は R3 から引き継いだ設計（R4 でもそのまま適用）。

## R3 のゴール

**「決済まで含めて動く・テストがある・Railway に本番が出ている」完成品**にする。R2 の設計・スコープを土台に、以下を最初から織り込んでゼロから書き直す。

| R3 で新たに入れるもの | 概要 |
|---|---|
| Stripe 決済（test mode） | チェックアウトに Payment Element。Webhook で注文を `paid` に遷移 |
| 注文ステータス state machine | `pending → paid → shipped → completed` ＋ `cancelled`（在庫復元） |
| トランザクションメール | パスワードリセット / 注文確認 / 発送通知。Resend（本番）/ Mailpit（ローカル）。メール認証は実装しない（ポートフォリオ用途のため 2026-09-14 撤去。`docs/rebuild-log.md`） |
| キュー | `QUEUE_CONNECTION=database` + 専用 worker。メール送信・Webhook 後処理をジョブ化。Redis は入れない |
| パスワードリセット フロー | R2 は列だけ存在してフロー未実装だった |
| ISR + `revalidateTag` | カタログ読み取りと CMS コンテンツをキャッシュ、管理側の更新でオンデマンド無効化 |
| 軽量 CMS | トップの Hero / Concept / Lookbook / About を管理画面から編集 |
| 自動テスト（Pest 3） | Feature 中心 + 純粋ロジックの Unit。機能実装と並行して書く |
| 本番デプロイ | Railway（Docker）。frontend / backend / queue / postgres / bucket |

## R3 でも「やらない」こと

R2 から引き継ぐ非スコープ + R3 で新たに線を引くもの。

- お気に入り、検索、レビュー、クーポン、ゲスト注文
- 複数配送先・分割配送・返品 RMA フロー
- 多言語 / 多通貨（JPY 税込のみ）
- 運用・法務・コンプラ・監視の作り込み、負荷試験、SLO
- リアルタイム在庫、WebSocket、通知センター
- 決済手段の追加（コンビニ・PayPay 等）。Stripe カード決済のみ

### Redis を入れない（R3 で検討し、見送り）

キューは R3 で `database` ドライバに切り替えたが、**Redis は入れない**。検討した用途と判断:

| 用途 | Redis の利点 | R3 の判断 |
|---|---|---|
| カタログ読み取りのサーバー側タグ付きキャッシュ（`Cache::tags()` は Redis/Memcached 必須） | 管理更新でのタグ無効化 | **Next.js の ISR + `revalidateTag` に寄せた**ので二重になる。ISR HIT 時は Laravel に届かない |
| レートリミッタの backing store | アトミック increment + TTL、DB 肥大なし | ポートフォリオの流量では `database` cache で十分 |
| キューのポーリング負荷 | jobs テーブル polling が消える | メール4種・低頻度。`--sleep` の DB 読みは無視できる |
| セッション | — | トークン認証でセッション不使用（`SESSION_DRIVER=array`） |

「予測で作らない / 差し替える予定がある時だけ抽象化する」（`docs/06` §0）に従い、実負荷が生じてから足す。在庫・決済・冪等性はそもそもキャッシュせず常にリアルタイム DB。

## 技術スタック

| 層 | 技術 |
|---|---|
| フロントエンド | Next.js 15 (App Router) + TypeScript + Tailwind CSS v4 |
| 状態管理（カート） | Zustand + localStorage 永続化（キー `ecp-cart`） |
| フォーム / 検証 | react-hook-form + @hookform/resolvers + zod |
| クライアントデータ取得 | TanStack Query（ログイン状態表示・住所録・カート再検証・決済ステータス確認のみ。`/admin` は Server Component で取得し使わない） |
| 決済 UI | @stripe/stripe-js + @stripe/react-stripe-js（Payment Element） |
| 画像プロキシ | @aws-sdk/client-s3（Next.js `/media/[...key]` がバケットから GetObject） |
| アイコン | lucide-react |
| バックエンド | Laravel 12 (API専用) + Sanctum（トークン認証） |
| 決済 | stripe/stripe-php（PaymentIntent + Webhook） |
| メール | Laravel Mail（Markdown）。本番 Resend / ローカル Mailpit（SMTP） |
| キュー | `QUEUE_CONNECTION=database`（jobs テーブル）+ `queue:work` worker。Redis なし |
| DB | PostgreSQL 16 |
| 画像ストレージ | Railway Storage Bucket（private・S3互換）。Next.js の `/media` プロキシ経由で配信。ローカルは RustFS |
| backend アプリサーバー | nginx + php-fpm（`serversideup/php:8.4-fpm-nginx` をローカル・本番で共用） |
| テスト | Pest 3（backend）。フロントは tsc + eslint + 主要導線の手動/CDP 確認 |
| ローカル実行形態 | すべて Docker。`docker compose up -d` で frontend / backend / queue / db / rustfs / mailpit が起動 |
| 本番実行形態 | Railway（Docker デプロイ） |

原則ライブラリを増やさない方針は R2 から継続。R3 で追加するのは上表の Stripe 2 種・stripe-php・メールトランスポート・Pest のみ。理由は `rebuild-log.md` に残す。

## アーキテクチャ方針

- **BFF パターン**: ブラウザは Next.js とだけ通信。Next.js のサーバー側（Route Handler / Server Component）が Laravel API を呼ぶ。
- Laravel は原則公開せず Railway の内部ネットワークのみに配置。**例外は Stripe Webhook の1エンドポイントのみ**（`POST /api/stripe/webhook`）。Stripe から直接叩かれる必要があり、BFF を挟めない。署名検証で保護する（`docs/09-payments-stripe.md`）。
- 認証トークンは Next.js が httpOnly Cookie（`ecp_token`）で保持し、サーバー側で `Authorization: Bearer` を付与。
- カタログ読み取りは ISR（タグ付きキャッシュ）＋ 管理更新時のオンデマンド無効化。個人化データ（注文・住所・カート）は常に動的。

## デザイン方針（R2 から不変）

Balenciaga 公式サイトを参照した硬質なミニマル・モノトーン。

- 配色は `#000 / #fff / #f4f4f4 / #767676` の4色のみ、区切りは原則ボーダー（影は使わない）
- 細いサンセリフ、全大文字、字間広め（tracking）
- 極端な余白、フルスクリーンのヒーロー画像
- アニメーションは opacity と画像差し替えのみ
- ダークモードは持たない

## 商品構成（R2 から不変）

ユニセックス。性別（MEN/WOMEN）の区別なし。カテゴリは Tops / Bottoms / Outerwear / Accessories の4フラット、各 3〜6 点。サイズは S / M / L（アクセサリーは FREE 単一）。参考サイトは yz-store.com/collections/9090。

## ドキュメント

| ファイル | 内容 |
|---|---|
| `01-sitemap-pages.md` | サイトマップと各ページの構成 |
| `02-database-design.md` | テーブル定義と ER |
| `03-api.md` | API エンドポイント一覧 |
| `04-deployment-railway.md` | Railway + Docker 本番デプロイ構成 |
| `05-admin.md` | 管理者ページ（`/admin`）と画像ストレージ |
| `06-laravel-design.md` | Laravel 側の設計指針（レイヤー構成 / Action・Service / 命名規約） |
| `07-local-dev.md` | ローカル開発環境（すべて Docker） |
| `08-frontend-design.md` | フロントエンド設計（ディレクトリ / データ取得 / 認証 / カート / スタイル / ISR） |
| `09-payments-stripe.md` | Stripe 決済（PaymentIntent ライフサイクル / Webhook / 冪等性 / 失敗時の在庫戻し） |
| `10-email.md` | トランザクションメール（Mailable / キュー / Mailpit・Resend） |
| `11-cms.md` | 軽量 CMS（`site_contents` スキーマ / 編集 UI / ISR 連携） |
| `12-testing.md` | テスト戦略（Pest 構成 / Factory / カバレッジの狙いどころ） |
| `rebuild-log.md` | R4 の実装記録。Step 単位で追記（R3 の記録は `../../EC-Portfolio/docs/rebuild-log.md`） |
