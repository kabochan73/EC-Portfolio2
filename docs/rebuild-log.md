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
