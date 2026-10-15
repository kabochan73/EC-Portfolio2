# EC-PORTFOLIO（R4）

架空のミニマル・アパレルブランドの EC サイト。ポートフォリオ用の作り直し **4回目**。

- 設計ドキュメント: [`docs/`](./docs/)
- R3（完成・本番稼働中）: `../EC-Portfolio/`
- スタック: Next.js 15 (App Router) + Laravel 12 (API) + PostgreSQL 16 + S3互換ストレージ
- アーキテクチャ: BFF（ブラウザ ↔ Next.js ↔ Laravel）

## R4 のゴール

R3 と同じスコープ・同じ技術スタックを **1 から書き直して、自分で説明できるようにする**。R3 からの追加機能は 1 つ。

| 追加要素 | 概要 |
|---|---|
| 売上ダッシュボード | 管理画面に売上 KPI・日別/月別の棒グラフ・カテゴリ別の商品ランキング（`docs/05-admin.md`） |

R3 で入れた機能（Stripe 決済 / 注文ステータス state machine / トランザクションメール / キュー / ISR / 軽量 CMS / 自動テスト / Railway デプロイ）はすべて引き継ぐ。詳細は [`docs/00-overview.md`](./docs/00-overview.md)。

## ディレクトリ構成（予定）

```
EC-Portfolio2/
├── docker-compose.yml   # ローカル開発環境（全サービス）
├── frontend/            # Next.js
├── backend/             # Laravel（serversideup/php イメージで実行）
└── docs/                # 設計ドキュメント
```

## ローカル開発

**すべて Docker。ホストに PHP / Node / Composer は不要**（frontend の `node_modules` のみ IDE 補完用にホストへ）。

```bash
docker compose up -d
```

- frontend: http://localhost:3000
- backend: http://localhost:8000 （BFF のため通常はブラウザから触らない。curl / Stripe CLI 用）
- RustFS コンソール（S3 互換ストレージ）: http://localhost:9001/rustfs/console/
- Mailpit（メール受信箱）: http://localhost:8025

コンテナ名は `ecp4-*`。ポートは R3 と同じなので、**R4 を起動する前に R3 を止める**（`../EC-Portfolio` で `docker compose down`）。

artisan / composer / npm などは `docker compose exec` 経由。詳細は [`docs/07-local-dev.md`](./docs/07-local-dev.md)。

## 進捗

実装ログは [`docs/rebuild-log.md`](./docs/rebuild-log.md) を参照。
