# フロントエンド設計（Next.js 15 / App Router）（R4）

土台は `docs/00`（スタック）・`docs/01`（サイトマップ）・`docs/03`（API と BFF 対応表）。ここは「フロントをどう組むか」に絞る。R2 の設計を継承し、R3 の追加（ISR / Stripe Payment Element）を織り込む。メール認証は実装しない（2026-09-14 撤去。`docs/rebuild-log.md`）。

---

## 1. アーキテクチャ（BFF のフロント視点）

ブラウザは Next.js だけと通信する。Laravel を直接叩かない。

| データ | 経路 | 実装 |
|---|---|---|
| 読み取り（商品・カテゴリ・CMS） | Server Component → `lib/<domain>.ts` → `apiFetch`（サーバー専用、**ISR タグ付き**）→ Laravel | Cookie 不要 |
| 書き込み・個人化（認証・注文・住所・プロフィール・決済） | Client Component → `fetch('/bff/...')` → Route Handler（`app/bff/**/route.ts`）→ `lib/<domain>.ts` が httpOnly Cookie のトークンを付けて Laravel | Route Handler は薄く |

```
ブラウザ
  ├─ (Server Component)  ──→ apiFetch(tags) ─────────→ Laravel  （商品・カテゴリ・CMS）
  └─ fetch('/bff/x')  ──→ app/bff/x/route.ts ──→ Laravel  （認証・注文・住所・決済）
                              └ Cookie の ecp_token を Bearer に載せ替える
                              └ 更新系は成功後に revalidateTag()
```

---

## 2. ディレクトリ構成

```
frontend/
├── middleware.ts                 # /account /checkout /admin の Cookie 有無ガード
├── app/
│   ├── layout.tsx                # <html><body> のシェルだけ
│   ├── globals.css               # Tailwind + デザイントークン（4色）
│   ├── (shop)/                   # ストアフロント。Header/Footer 付き共通レイアウト
│   │   ├── layout.tsx
│   │   ├── not-found.tsx  loading.tsx  error.tsx
│   │   ├── (catalog)/
│   │   │   ├── page.tsx          #   /  トップ（CMS 駆動）
│   │   │   └── products/[slug]/page.tsx
│   │   ├── (cart)/
│   │   │   ├── cart/page.tsx
│   │   │   ├── checkout/page.tsx
│   │   │   ├── checkout/payment/page.tsx         # ← R3
│   │   │   └── checkout/complete/page.tsx
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx  register/page.tsx
│   │   │   ├── forgot-password/page.tsx          # ← R3
│   │   │   └── reset-password/page.tsx           # ← R3
│   │   └── (account)/
│   │       └── account/…
│   ├── admin/                    # 管理画面。独自レイアウト
│   │   └── content/page.tsx      # ← R3 CMS 編集
│   ├── media/[...key]/route.ts   # S3 プロキシ
│   └── bff/
│       ├── login  register  logout  me  me/password
│       ├── forgot-password  reset-password                     # ← R3
│       ├── addresses/…  orders  orders/[number]
│       ├── cart/validate                                       # ← R3（明示ルート化）
│       ├── checkout/payment-intent                             # ← R3
│       └── admin/…                                             # 更新系は revalidateTag
├── components/
│   ├── layout/     Header Footer CartCount AccountLink
│   ├── home/       Hero BrandConcept Lookbook CategoryGrid AboutSection
│   ├── product/    ProductCard ProductMedia Gallery VariantSelector Accordion SizeChartTable
│   ├── cart/       CartLine CartSummary
│   ├── checkout/   AddressPicker AddressForm OrderReview PaymentForm(Stripe)   # ← R3
│   ├── account/    OrderList AddressBook ProfileForm PasswordForm LogoutButton VerifyEmailBanner  # ← R3
│   ├── auth/       LoginForm RegisterForm ForgotPasswordForm ResetPasswordForm  # ← R3
│   ├── admin/      …  ContentEditor(Hero/Concept/Lookbook/About)  OrderFulfillment  # ← R3
│   ├── ui/         Button Field Badge
│   └── providers/  CartHydration QueryProvider StripeProvider   # ← R3
└── lib/
    ├── api.ts          # apiFetch（サーバー専用）／ApiError／apiErrorResponse
    ├── types.ts        # Laravel Resource と 1:1 の型
    ├── constants.ts    # SESSION_COOKIE_NAME, ISR タグ生成, 送料しきい値（表示用）
    ├── revalidate.ts   # ← R3: タグ名の一元管理 + revalidate ヘルパ
    ├── products.ts categories.ts content.ts auth.ts addresses.ts orders.ts checkout.ts  # ドメイン別
    ├── schemas/        # zod スキーマ 1フォーム1ファイル
    ├── stores/cart.ts  # zustand（persist、キー ecp-cart）
    └── hooks/          # useCartValidation, useOrderStatusPolling(← R3)
```

**規約**: `.tsx` は JSX を返す関数だけ。`apiFetch` を呼ぶだけの関数・型定義・zod スキーマは `lib/` に置く。

---

## 3. データ取得と ISR（R3 の中心）

### 3.1 読み取り（商品・カテゴリ・CMS）

- Server Component が `lib/products.ts` / `lib/categories.ts` / `lib/content.ts` の関数を呼ぶ。関数内で `apiFetch`。
- `@tanstack/react-query` は使わない（サーバーで取って表示するだけ）。

### 3.2 ISR タグ設計

`lib/revalidate.ts` にタグ名を集約:

```ts
export const tags = {
  products: 'products',                       // 商品一覧・カード表示全般
  product: (slug: string) => `product:${slug}`,
  categories: 'categories',
  content: 'content',                         // CMS（トップの Hero/Concept/Lookbook/About）
} as const;
```

`apiFetch` の第2引数でタグと再検証間隔を渡す:

| 関数 | fetch オプション |
|---|---|
| `getCategories()` | `{ next: { tags: [tags.categories], revalidate: 3600 } }` |
| `getProducts({category?})` | `{ next: { tags: [tags.products], revalidate: 600 } }` |
| `getProduct(slug)` | `{ next: { tags: [tags.product(slug), tags.products], revalidate: 600 } }` |
| `getContent()` | `{ next: { tags: [tags.content], revalidate: 3600 } }` |

- `revalidate` は保険（何もしなくても最終的に新しくなる）。**正はオンデマンド無効化**。
- 個人化データ（`/account` `/cart` `/checkout` `/admin` 配下の取得）は `cache: 'no-store'` 固定。タグは付けない。

### 3.3 オンデマンド無効化（`revalidateTag`）

更新系の BFF Route Handler が Laravel 呼び出し成功後に対応タグを無効化:

| 操作（BFF ルート） | 無効化するタグ |
|---|---|
| `PUT/POST/DELETE /bff/admin/products*`, `.../variants*`, `.../images*` | `products` ＋（slug が分かれば `product:{slug}`）|
| `PUT/POST/DELETE /bff/admin/categories*` | `categories` ＋ `products`（カード内のカテゴリ名表示のため）|
| `PUT /bff/admin/content/*` | `content` |

`lib/revalidate.ts` に `revalidate(tag: string)` ヘルパ（`revalidateTag` を try/catch でラップしログ）。商品更新時に slug が取れないケース（画像・バリアント操作）は `products` だけ無効化 + 個別 `product:{slug}` は `revalidate` 間隔（10分）に任せる、を許容する。

### 3.4 書き込み・個人化（R2 と同じ方針）

- Client Component が `fetch('/bff/...')`。Route Handler が Cookie のトークンを `lib/<domain>.ts` に渡し `Authorization: Bearer` を付けて Laravel へ。
- Route Handler 本体は「body を読む → lib の関数を呼ぶ → Cookie 操作 / revalidateTag → JSON を返す」だけ。
- `@tanstack/react-query` を使うのは、ログイン状態の `AccountLink`、カートの在庫再検証、決済ステータスのポーリングの 3 つだけ（R4。R3 は住所録 `AddressBook` でも使っていたが、§3.6 の方針で `router.refresh()` に変更）。ログイン / 登録 / プロフィール更新 / ログアウトは、成功時に `AccountLink` のキャッシュを無効化するためだけに `useQueryClient` を使う。
- **`/admin` は TanStack Query を使わない**（R3 の実装に合わせて R4 で docs を修正）。ルールは「読み取り = Server Component、操作 = Client Component」:
  - `page.tsx` は async Server Component。`requireAdmin()` → Cookie のトークンで `fetchAdminXxx(token)`（`no-store`）→ 描画
  - 検索・絞り込み・ページングは URL の `searchParams` で持つ（クライアント state を持たない）
  - フォーム・ボタンだけ `"use client"`。`fetch('/bff/admin/...')` で更新 → 成功後 `router.refresh()` でサーバーが再描画
  - 理由: トークンが httpOnly Cookie なのでサーバーで取るのが最短（CSR だと GET 用の BFF ルートが一覧・詳細ごとに要る）/ 権限チェックが描画より先に済む / URL だけで画面状態が再現できる
  - 売上ダッシュボードも同じ。`/api/admin/sales` はページで 1 回取得し、日別⇔月別の切り替えだけ小さな Client Component の `useState`

### 3.5 Laravel の 422 をフォームに出す

BFF は Laravel の `{ message, errors }` をそのまま同ステータスで中継。フォームは `errors` を react-hook-form の `setError` にマッピング。

### 3.6 ページごとの Server / Client Component（R4 で明文化。2026-10-16 ユーザーと決定）

**ルール: `page.tsx` と `layout.tsx` は全部 Server Component（SC）。Client Component（CC）は画面の中の「操作する部品」だけ。**

CC にするのは次のどれかに当てはまるときだけ:
1. ブラウザにしかないデータを使う（カート = localStorage）
2. ユーザーの操作で画面が変わる（フォーム、ボタン、サイズ選択、グラフの日別⇔月別）
3. ブラウザから定期的に取り直す（決済完了のポーリング）

読み取りは SC が行い、CC は**操作したら `router.refresh()` でサーバーに描き直してもらう**。CC が自分で一覧を取り直すことはしない。

**ストア**

| ページ | page.tsx | サーバーで取るデータ | CC の部品 |
|---|---|---|---|
| `/` | SC（ISR） | CMS・カテゴリ・商品 | なし |
| `/products/[slug]` | SC（ISR） | 商品詳細・関連商品 | `VariantSelector`（サイズ・色の選択 + カート追加） |
| `/cart` | SC | なし | `CartView`（中身は全部 localStorage なので CC） |
| `/login` `/register` | SC | なし | フォーム |
| `/forgot-password` | SC | なし | フォーム |
| `/reset-password` | SC | `searchParams` の token / email | フォーム（token / email は props で受け取る） |
| `/account` | SC | ログインユーザー | `LogoutButton` |
| `/account/orders`、`/[number]` | SC | 注文一覧・詳細 | なし |
| `/account/addresses` | SC | 住所一覧 | `AddressBook`（追加・編集・削除・★ → `router.refresh()`） |
| `/account/profile` | SC | ログインユーザー | `ProfileForm` / `PasswordForm` |
| `/checkout` | SC | 住所一覧 | `CheckoutClient`（カートを読むため） |
| `/checkout/payment` | SC | 注文 + **PaymentIntent（client_secret）** | `PaymentForm`（Stripe の入力欄はブラウザで動く） |
| `/checkout/complete` | SC | 注文、`searchParams` の `redirect_status` | `CheckoutComplete`（paid までポーリング → カートを空に） |

**管理画面**

| ページ | page.tsx | CC の部品 |
|---|---|---|
| `/admin` | SC（stats + 売上） | `SalesChart`（日別⇔月別の切り替えだけ） |
| `/admin/categories` | SC | `CategoryManager` |
| `/admin/products`、`/new`、`/[id]` | SC | `ProductForm` / `ProductImagesManager` / `VariantsManager` |
| `/admin/orders`、`/[number]` | SC | `OrderStatusActions` |
| `/admin/customers`、`/[id]` | SC | なし |
| `/admin/content` | SC | 4 セクションの編集フォーム |

**全体で使う CC**: `QueryProvider` / `CartHydration` / ヘッダーの `CartCount`・`AccountLink`（ページを ISR で全員に同じ HTML として配るため、ログイン状態はブラウザ側で取る）/ `AdminNav`（現在のページの強調表示）

**R3 から変えた点**

1. **操作後の再取得を `router.refresh()` に統一**。R3 は `CategoryManager` / `VariantsManager` / `ProductImagesManager` が自前の `fetch` で一覧を取り直し、`AddressBook` は TanStack Query の `initialData` で二重に持っていた（一方 `OrderStatusActions` と商品の基本情報編集は `router.refresh()`）。同じデータを取る処理が SC と CC に 2 つあり、取り直し専用の GET の BFF ルート（`/bff/admin/categories`、`/bff/admin/products/{id}`、`/bff/addresses`）が余分に要っていた → 削除
2. **URL のパラメータは SC の `searchParams` で読んで props で渡す**。R3 の `/reset-password` と `/checkout/complete` は CC が `useSearchParams()` を使い、そのためにページを `<Suspense>` で包んでいた → 不要に
3. **`/cart` の page.tsx を SC に**。R3 はここだけページ全体が `"use client"` だった。例外のないルールにし、metadata も他のページと同じ書き方にする

---

## 4. 認証（R2 と同じ。メール認証は実装しない）

- トークンは httpOnly Cookie `ecp_token`（`secure` は本番のみ / `sameSite=lax` / `path=/` / 30日）。
- Cookie 名は `lib/constants.ts` の `SESSION_COOKIE_NAME`（`middleware.ts`（Edge）と `lib/auth.ts`（Node）両方から参照）。
- `lib/auth.ts`（サーバー専用）: `getSessionToken()` / `setSessionCookie` / `clearSessionCookie` ＋ `loginUser` `registerUser` `logoutUser` `fetchCurrentUser` `updateProfile` `updatePassword` `sendPasswordReset` `resetPassword`。
- `middleware.ts`: `/account/*` `/checkout/*` `/admin/*` は **Cookie の有無だけ**。無ければ `/login?redirect=`。
- メール認証は実装しない（2026-09-14 撤去。ポートフォリオ用途のため、登録さえすれば誰でもチェックアウトまで進める）。`docs/rebuild-log.md` 参照。

---

## 5. カート（R2 と同じ）

- `lib/stores/cart.ts` … zustand + `persist`（localStorage キー **`ecp-cart`**）。サーバーには送らない。ブラウザ単位。
- `persist` は `skipHydration: true`。`components/providers/CartHydration.tsx` がマウント後に `rehydrate()`。
- カートに持つのは追加時点のスナップショット（`variantId` / `productSlug` / `productName` / `size` / `color` / `unitPrice` / `quantity` / `imageUrl`）。`/cart` `/checkout` 表示時に `GET /bff/cart/validate` で再検証。
- 確定金額は `POST /api/orders` でサーバーが再計算。フロント表示がズレても実害なし。
- ヘッダーの `CART (n)` は数量合計。
- **注文完了時（`/checkout/complete` で `paid` 確認 or タイムアウト）にカートを空にする**。決済ページで離脱した場合はカートを残す（再開できるように）。

---

## 6. 決済（R3。`docs/09` と対）

### StripeProvider

`components/providers/StripeProvider.tsx`（Client）:
```tsx
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
// <Elements stripe={stripePromise} options={{ clientSecret, appearance }}> でラップ
```
`appearance` はモノトーン（`theme: 'flat'` ベースにボーダーのみ、角丸なし、フォント継承）。

### `/checkout/payment` フロー

1. Server Component: `getOrder(number)` で対象注文を取得。`pending` でなければ状態別にリダイレクト（`paid`→complete、`cancelled`→orders 詳細）。
2. 同じ Server Component が `POST /api/checkout/payment-intent`（`{ order_number }`）を呼び、`{ client_secret, publishable_key }` を受け取る（R4 で docs を実装に合わせて修正。R3 の docs は「Client がマウント時に作る」と書いていたが、実装はサーバー側で作っていた）。503（Stripe 未設定）・409（価格が変わった）は、この SC がパネルで表示する
3. Client `PaymentForm`:
   - props で受け取った `clientSecret` / `publishableKey` で `<Elements options={{ clientSecret }}>` → `<PaymentElement />` + `SUBMIT` ボタン
   - `stripe.confirmPayment({ elements, confirmParams: { return_url: `${SITE_URL}/checkout/complete?order=${number}` }, redirect: 'if_required' })`
   - 成功（`redirect: 'if_required'` で即返る場合）→ `router.push('/checkout/complete?order=..')`
   - 3DS などでリダイレクトが必要な場合は Stripe が `return_url` へ飛ばす
   - エラー（`error.type === 'card_error' | 'validation_error'`）→ フォーム下にメッセージ。注文は `pending` のまま
4. `client_secret` は再訪時に同じ PaymentIntent のものが返る（`docs/09` の再利用）。

### `/checkout/complete`

- `useOrderStatusPolling(number)` フック: `GET /bff/orders/{number}` を 1.5 秒間隔で最大 ~10 秒ポーリング、`status` が `paid` 以上になったら停止。
- `paid` → 注文番号・`VIEW ORDER`・`CONTINUE SHOPPING`、カートを空に。
- タイムアウト → 「決済を受け付けました。反映まで少しかかることがあります」＋ `VIEW ORDER`、カートは空に（Webhook が最終的に確定させる）。
- URL に Stripe の `redirect_status=failed` が付いていたら（SC の `searchParams` で読んで props で渡す。§3.6）「決済に失敗しました」＋ `/checkout/payment?order=..` へ戻すリンク。

---

## 7. 型（`lib/types.ts`）

- `backend/app/Http/Resources/*` と 1:1。Resource を変えたらここも直す（コメントで対応ファイル名）。
- `ApiResource<T> = { data: T }` / `ApiCollection<T> = { data: T[] }`。
- 1関数専用の入力型（`LoginPayload` など）も全部ここ。`.ts`/`.tsx` に `type X = {...}` を直書きしない。
- `OrderStatus` / `StockStatus` は `backend/app/Enums/*` と一致（`'pending' | 'paid' | 'shipped' | 'completed' | 'cancelled'`）。
- 決済系: `PaymentIntentResponse = { client_secret: string; publishable_key: string }`、`OrderDetail` に `payment?: { status: string; last_error: string | null }`。
- CMS: `SiteContent = { hero: {...}; concept: {...}; lookbook: {...}; about: {...} }`（`docs/11`）。

---

## 8. バリデーション（`lib/schemas/`）

- 1フォーム 1ファイル（`login` `register` `profile` `password` `address` `forgotPassword` `resetPassword` `adminProduct` `adminVariant` `adminCategory` `siteContent`）。
- コンポーネント内に `z.object` を直書きしない。
- クライアント zod は UX。最終防衛は Laravel の FormRequest。ルール（桁・`123-4567` 形式）はバックエンドと揃える。
- 決済フォームには zod スキーマを持たない（カード情報は Stripe Element が握り、こちらは触れない）。

---

## 9. スタイル

- Tailwind v4 の CSS-first。`globals.css` にトークン、配色は **4色のみ**:
  - `--color-ink` `#000` / `--color-paper` `#fff` / `--color-mist` `#f4f4f4` / `--color-graphite` `#767676`
- **ダークモードなし**。`app/layout.tsx` のスキャフォールド（`dark:` クラス・`Geist_Mono` 等）は掃除。
- 全大文字・字間広め（tracking）・極端な余白・区切りは原則ボーダー（影を使わない）。
- フォントは Geist Sans（スキャフォールド既定）。等幅は外す。
- アニメーションは `opacity` と画像差し替えのみ。
- Stripe Payment Element の `appearance` もこのトークンに合わせる（`docs/09`）。

---

## 10. 画像と「NO IMAGE」

- `components/product/ProductMedia.tsx`: `images[0]` があれば `next/image`、無ければ `bg-mist` に `NO IMAGE`（`text-graphite`・全大文字・字間広め）。
- 一覧カードのホバー差し替えは `images[1]` がある時だけ。
- 画像配信は `/media/[...key]/route.ts`（`@aws-sdk/client-s3` の `GetObjectCommand`、ローカルの RustFS は `forcePathStyle: true`）。`next/image` の loader はデフォルト（同一オリジン `/media/...`）。
- R3 の商品シードは画像付き（ユーザー提供）。CMS も画像を持つ。

---

## 11. エラー・ローディング・空状態

- ルートセグメントごとに `loading.tsx`（スケルトン）/ `error.tsx`（リトライ）/ `not-found.tsx`。商品詳細の 404 は `notFound()`。
- 空状態の文言は `docs/01` 準拠。
- 決済ページの `error.tsx` は「決済を開始できませんでした。カートに戻る」。

---

## 12. 環境変数

| 変数 | スコープ | 用途 |
|---|---|---|
| `API_URL` | サーバー専用 | `apiFetch` の向き先。ローカル `http://backend:8080` |
| `NEXT_PUBLIC_SITE_URL` | クライアント可 | 絶対 URL・Stripe `return_url` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | クライアント可 | Payment Element 初期化 |
| `BUCKET_*`（ENDPOINT / ACCESS_KEY_ID / SECRET_ACCESS_KEY / NAME / REGION） | サーバー専用 | `/media` プロキシ |

`NEXT_PUBLIC_` の付かない変数はブラウザに渡らない。`lib/api.ts` `lib/auth.ts` など「サーバー専用」ファイルをクライアントから import しない。

---

## 13. 実装の順序（フロント Step。`docs/rebuild-log` に対応）

1. **共通レイアウト**: `app/layout.tsx` 掃除 + `globals.css` トークン + `(shop)/layout.tsx` + `lib/{api,types,constants,revalidate}.ts`
2. **トップページ（CMS 駆動 + ISR）**: `(catalog)/page.tsx` — Hero / Concept / Lookbook / CategoryGrid / About + `ProductCard` + `ProductMedia` + `lib/{products,categories,content}.ts`
3. **商品詳細（ISR）**: Gallery / VariantSelector / Accordion / SizeChartTable / related、`notFound()`
4. **カート**: `lib/stores/cart.ts` / `CartHydration` / `useCartValidation` / `/bff/cart/validate`
5. **認証 + パスワードリセット**: login / register / forgot-password / reset-password + `app/bff/*` + `lib/auth.ts` + `middleware.ts`
6. **マイページ**: `account/*` + `app/bff/{me,me/password,addresses,orders}` + `VerifyEmailBanner`
7. **チェックアウト（配送先 → 注文作成）**: `/checkout` + `OrderReview` + `POST /bff/orders`
8. **決済（Stripe）**: `StripeProvider` / `PaymentForm` / `/checkout/payment` / `/checkout/complete` + `useOrderStatusPolling` + `/bff/checkout/payment-intent`
9. **管理画面**: レイアウト + 各テーブル + フォーム（ec2 踏襲）+ `revalidateTag` 組み込み
10. **CMS 編集**: `/admin/content` + `ContentEditor` + 画像アップロード + `revalidateTag('content')`
11. **仕上げ**: `loading/error/not-found`、レスポンシブ確認
