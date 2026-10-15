# サイトマップ / ページ設計（R4）

参考: yz-store.com/collections/9090 のコレクションページ／商品詳細ページの構成。
配色・タイポは Balenciaga 公式寄りのミニマル・モノトーン。

## ルート一覧

| パス | 内容 | 認証 |
|---|---|---|
| `/` | トップ（ブランドコンセプト・ストーリー＋カテゴリごとの全商品）。**CMS コンテンツ駆動** | 公開 |
| `/products/[slug]` | 商品詳細 | 公開 |
| `/cart` | カート | 公開 |
| `/checkout` | 配送先入力・注文内容確認 → `pending` 注文作成 | 要ログイン |
| `/checkout/payment` | Stripe Payment Element で決済 | 要ログイン |
| `/checkout/complete` | 注文完了（決済結果の反映待ちを含む） | 要ログイン |
| `/login` | ログイン | 公開 |
| `/register` | 会員登録 | 公開 |
| `/forgot-password` | パスワード再設定メールの送信 | 公開 |
| `/reset-password` | 新パスワード設定（メールのリンクから） | 公開（トークン必須） |
| `/account` | マイページ ダッシュボード | 要ログイン |
| `/account/orders` | 注文履歴 | 要ログイン |
| `/account/orders/[number]` | 注文詳細 | 要ログイン |
| `/account/addresses` | 住所録（一覧・追加・編集・削除・デフォルト設定） | 要ログイン |
| `/account/profile` | 氏名・メール・パスワード変更 | 要ログイン |
| `/admin/**` | 管理者ページ（詳細は `docs/05-admin.md`） | 要 admin |

ブランド紹介は独立ページを持たず `/` トップページ内のセクションとして統合する（R1 で決定、継続）。
カテゴリ別一覧（`/collections/[category]`）・全商品一覧も作らない（小規模カタログのため、トップのカテゴリセクションで出し切る）。

未ログインで要ログインページに来たら `/login?redirect=<元パス>` に転送。
`/admin/*` は `middleware.ts` で Cookie 有無をチェック、実際の role 確認は Server Component の `requireAdmin()`。

## メール認証について

実装しない（2026-09-14 撤去）。ポートフォリオ用途のため、登録さえすれば誰でも注文確定・決済まで一通り体験できる。詳細は `docs/rebuild-log.md`。

## 共通レイアウト

### ヘッダー
- 左: `EC-PORTFOLIO` ロゴ（`/` へ）
- 中央: 無し（ナビ・検索なし）
- 右: `ACCOUNT`（未ログイン時 `/login`、ログイン時 `/account`）/ `CART (n)`（n は数量合計）
- 常に白背景・下ボーダー固定。モバイルもハンバーガーにせず同じ1行バー

### フッター
- ロゴ（`EC-PORTFOLIO`）＋ ダミーの電話番号（`tel:`）＋ ダミーのお問い合わせメール（`mailto:`、ドメインは IANA 予約の `example.jp`）
- `© 2026 EC-PORTFOLIO. All rights reserved.`
- ニュースレター入力・プレースホルダリンクは置かない（R2 で撤去、継続）

## 各ページ

### `/` トップ（CMS 駆動）

セクション構成は R2 と同じ。**文言・画像は `site_contents` から取得**（`docs/11-cms.md`）。CMS に値が無い場合はビルド時のプレースホルダを表示（壊れない）。

1. フルスクリーンのヒーロー画像＋中央に小さくブランド名とタグライン（`hero` コンテンツ）
2. ブランドコンセプト文（3〜4行、余白広め、中央寄せ。理念・スタンスのみ）（`concept` コンテンツ）
3. ルックブックの横スクロール帯（画像のみ 5〜6枚）（`lookbook` コンテンツ）
4. カテゴリごとの商品セクション（`TOPS` `BOTTOMS` `OUTERWEAR` `ACCESSORIES` の順）: カテゴリ名の極太見出し＋そのカテゴリの全公開商品を `position` 順にグリッド表示
5. `ABOUT` セクション（沿革・素材へのこだわり・製造背景。理念は繰り返さない）（`about` コンテンツ）

データ取得: セクション 1〜3・5 は CMS（`getContent()`、ISR タグ `content`）、セクション 4 は商品（`getProducts()`、ISR タグ `products` / `categories`）。

商品グリッド: PC 4カラム / タブレット 3 / モバイル 2。商品カード（yz 参照）:
- 画像（`position=0`）、ホバーで `position=1` に差し替え
- 左上バッジ: `NEW`（作成30日以内）/ 在庫バッジ `LOW STOCK`・`SOLD OUT`
- カテゴリ名（小・グレー・全大文字）
- 商品名（最大2行）
- 価格 `¥12,000`

並び順は `products.position`。ソート UI なし。カテゴリに商品0件時はそのセクション自体を出さない。

### `/products/[slug]` 商品詳細（yz 参照）

R2 から不変。
- パンくず: `HOME / 商品名`
- 左: 画像ギャラリー（全画像を縦積み）。モバイルは横スワイプカルーセル＋ドット
- 右: スティッキーパネル
  - カテゴリ（小・グレー・全大文字）
  - 商品名 / 価格
  - 配送目安の囲み（`SHIPPING: 3–5 BUSINESS DAYS`、静的）
  - 色スウォッチ（複数色ある商品のみ。選択で画像・在庫を切替）
  - サイズセレクタ（`stock=0` はグレーアウト・選択不可、`1〜5` はサイズ横に `LOW STOCK`）
  - `ADD TO CART`（サイズ未選択時は非活性）
  - アコーディオン: `DESCRIPTION` / `MATERIAL & CARE` / `SIZE GUIDE`（`size_chart` を表、null は非表示）/ `SHIPPING & RETURNS`（静的）
  - スペック（アコーディオン外に小さく）: `ORIGIN` / `PRODUCT CODE`
- 下部: `YOU MAY ALSO LIKE` — 同カテゴリの他の公開商品を position 順に全件

ISR: `getProduct(slug)` にタグ `product:{slug}` と `products`。

### `/cart` カート

R2 から不変。
- 明細行: サムネ / 商品名・サイズ（・色）/ 単価 / 数量ステッパー / 小計 / 削除
- 数量上限は当該 variant の `stock`
- サマリー: `SUBTOTAL` / `SHIPPING` / `TOTAL` / `CHECKOUT` ボタン
- 空カート: `YOUR CART IS EMPTY` ＋ `CONTINUE SHOPPING`
- カートは Zustand + localStorage（キー `ecp-cart`）。ヘッダーの `CART (n)` と同期
- ページ表示時に各明細の商品/在庫/価格を API で再検証

### `/checkout` チェックアウト（配送先 → 注文作成）

1. 配送先: 住所録から選択、または新規入力（「住所録に保存」チェック）
2. 注文内容の確認（明細・送料・合計）
3. `PLACE ORDER` → `POST /bff/orders`（→ Laravel `POST /api/orders`）→ `status = pending` で注文作成、在庫引き当て → `/checkout/payment?order=<number>` へ

### `/checkout/payment` 決済

1. 対象注文（`pending` かつ本人）を取得。`pending` でなければ状態に応じて `/checkout/complete` か `/account/orders/[number]` へ
2. `POST /bff/checkout/payment-intent` で `client_secret` を取得（サーバーが金額を再計算）
3. Stripe Payment Element を描画。テストカード `4242 4242 4242 4242`
4. `stripe.confirmPayment({ redirect: 'if_required' })` 成功 → `/checkout/complete?order=<number>` へ
5. カード拒否・3DS 失敗はフォーム内にエラー表示（注文は `pending` のまま、再試行可能）

### `/checkout/complete` 注文完了

- `POST /bff/orders/<number>` をポーリング（最大 ~10 秒、1.5 秒間隔）して `paid` になるのを待つ（Webhook 反映のラグ対策）
- `paid` 確認: `注文番号` 表示 / `VIEW ORDER`（注文詳細へ）/ `CONTINUE SHOPPING` / カートを空にする
- タイムアウト時: 「決済処理中です。数分後に注文履歴でご確認ください」＋ `VIEW ORDER`（カートは空にしてよい。Webhook が最終的に反映する）

### `/login` / `/register`

- ミニマルなフォーム（メール・パスワード、登録時は氏名も）
- 登録成功 → `redirect` 先 or `/account`（メール認証は実装しないため、確認メールも案内バナーも無し。2026-09-14）
- ログイン成功 → `redirect` 先 or `/account`
- ログインフォームに `Forgot your password?` → `/forgot-password`
- バリデーションエラーはフィールド下に表示

### `/forgot-password`

- メールアドレス入力 → `POST /bff/forgot-password`
- 成功時は「登録があればメールを送りました」の中立メッセージ（アカウント存在の漏洩を避ける）

### `/reset-password`

- URL の `token` / `email` を hidden で保持。新パスワード + 確認を入力 → `POST /bff/reset-password`
- 成功 → `/login`（「パスワードを変更しました」）

### `/account` ダッシュボード

- `ようこそ, {name}`
- `ORDERS` / `ADDRESSES` / `PROFILE` / `LOGOUT`（admin なら `ADMIN PANEL` も）

### `/account/orders` 注文履歴

- 一覧: 注文番号 / 日付 / 点数 / 合計 / ステータス（`PENDING` `PAID` `SHIPPED` `COMPLETED` `CANCELLED`）
- 行クリックで詳細へ

### `/account/orders/[number]` 注文詳細

- 配送先スナップショット / 明細 / 送料 / 合計 / ステータス / 注文日時
- `pending` の場合は `COMPLETE PAYMENT` ボタン（`/checkout/payment?order=<number>`）

### `/account/addresses` 住所録

R2 から不変。カード一覧（デフォルトにバッジ）、追加・編集・削除・デフォルト設定。
項目: 宛名 / 郵便番号 / 都道府県 / 市区町村 / 番地 / 建物（任意）/ 電話番号

### `/account/profile` プロフィール

- 氏名・メール変更フォーム
- パスワード変更フォーム（現パスワード必須）

## 業務ルール

- 送料: 一律 ¥800、小計 ¥20,000 以上で無料
- 価格・金額はすべて整数（JPY・税込）
- 在庫: **注文作成時**（`POST /api/orders`）に `stock` を減算（トランザクション内）。決済失敗・放棄で `cancelled` にすると在庫を戻す
- 在庫ステータス: `0`→SOLD OUT / `1〜5`→LOW STOCK / `6以上`→在庫あり（`config('shop.low_stock_threshold') = 5`）
- `NEW` バッジ: `created_at` が 30 日以内
- 注文ステータス遷移: `docs/02-database-design.md` の state machine 参照
