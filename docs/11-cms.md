# 軽量 CMS（R4）

## 目的

トップページの世界観パート（Hero / BrandConcept / Lookbook / About）を、コードを触らず管理画面から編集できるようにする。これは **ISR が一番効くシナリオ**（「編集したら即反映したいが、毎リクエスト API を叩きたくない」）なので、`revalidateTag` とセットで実装する。

**スコープを絞る**: 編集できるのは上記4セクションのテキストと画像のみ。ページ追加・ブロックの自由配置・リッチテキストエディタ・多言語・下書き/公開ワークフロー・バージョン履歴は**やらない**。フォームで JSON を編集する感覚の最小 CMS。

## データモデル（`site_contents`。`docs/02`）

| key | data の形 |
|---|---|
| `hero` | `{ "headline": string, "tagline": string, "image_url": string \| null }` |
| `concept` | `{ "body": string }`（改行区切りの短い文。3〜4行） |
| `lookbook` | `{ "images": [ { "url": string, "alt": string } ] }`（5〜6枚想定、0 でも可） |
| `about` | `{ "blocks": [ { "label": string, "heading": string, "body": string, "image_url": string \| null } ] }`（3ブロック想定） |

- `data` は `jsonb`。Model で `'data' => 'array'` キャスト。
- 画像は `image_url` に `/media/content/{key}/{ulid}.ext` を格納（商品画像と同じ bucket / プロキシ）。
- `updated_by` に最後に編集した admin の `user_id`。

## Seeder（`SiteContentSeeder`）

R2 のトップページに置いていたプレースホルダ文言をそのまま初期値にする（英語のブランド世界観文 + 画像 `image_url: null`）。マイグレーション直後でもトップページが成立する。

`db:seed` 時に `updateOrCreate(['key' => ...], ['data' => ...])` で冪等に。

## API

### 公開: `GET /api/content`

```json
{ "data": {
  "hero": { "headline": "...", "tagline": "...", "image_url": "/media/content/hero/01J..jpg" },
  "concept": { "body": "...\n..." },
  "lookbook": { "images": [ { "url": "/media/content/lookbook/01J..jpg", "alt": "..." } ] },
  "about": { "blocks": [ { "label": "Since 2019", "heading": "...", "body": "...", "image_url": null } ] }
} }
```

- 4 キーを必ず全部返す。DB に行が無いキーは `SiteContent::defaults($key)`（`SiteContentSeeder` と同じ定数）で埋める。
- `SiteContentResource`（or コントローラで組み立て）。`image_url` は `path` から `/media/` を前置。
- **ISR タグ `content`**（`docs/08` §3.2）。

### 管理: `GET /api/admin/content`

全 4 キーの生 `data`（編集フォーム用。デフォルト補完はする）。

### 管理: `PUT /api/admin/content/{key}`

body = そのキーのスキーマの JSON（`data` 全体を差し替え）。`UpdateSiteContent` Action:
1. `key` が 4 種のいずれかでなければ 404
2. FormRequest（`UpdateSiteContentRequest`）が `key` ごとに rules を出し分け（`switch ($this->route('key'))`）
3. `updateOrCreate(['key' => $key], ['data' => $validated, 'updated_by' => $user->id])`
4. → 200 更新後の `data`

### 管理: `POST /api/admin/content/{key}/images`

multipart（`image`、5MB 上限、`image` バリデーション）。`StorageService::put("content/{$key}", $file)` → `{ "url": "/media/content/hero/01J..jpg" }` を返す。フロントはこの URL を該当フィールドにセットしてから `PUT` する（画像アップロードと data 保存は2段階）。

孤児画像（アップロードしたが `PUT` されなかった画像）の掃除は R3 ではしない（少量・private なので許容）。

## フロント

### 公開側（`lib/content.ts` + トップページ）

```ts
export async function getContent(): Promise<SiteContent> {
  const res = await apiFetch<ApiResource<SiteContent>>('/api/content', {
    next: { tags: [tags.content], revalidate: 3600 },
  });
  return res.data;
}
```

トップページ（Server Component）:
```tsx
const [content, products, categories] = await Promise.all([getContent(), getProducts(), getCategories()]);
// <Hero {...content.hero} /> <BrandConcept body={content.concept.body} />
// <Lookbook images={content.lookbook.images} /> <CategoryGrid ... /> <AboutSection blocks={content.about.blocks} />
```

各コンポーネントは値が空文字 / 空配列 / null でも壊れないこと（`image_url` null → `bg-mist` プレースホルダ、`concept.body` 空 → セクションごと出さない、など）。

### 管理側（`/admin/content` + `ContentEditor`）

- タブ or アコーディオンで4セクション。各セクションは独立した `<form>`（RHF + zod。`lib/schemas/siteContent.ts` に4つのスキーマ）。
- 画像フィールド: 現在の画像プレビュー + 「画像を変更」→ `POST /bff/admin/content/{key}/images` → 返った URL を hidden field にセット → 見た目を更新。
- Lookbook / About は配列。行の追加・削除・並べ替え（`useFieldArray`）。
- 「保存」→ `PUT /bff/admin/content/{key}` → 成功で BFF が `revalidateTag('content')` → トースト「保存しました。トップページに反映されます」。
- 保存後にトップページを別タブで開くと即反映されていることを確認できる（ISR オンデマンド無効化のデモ）。

## テスト

- `GET /api/content` が行の無いキーもデフォルトで埋めて返す
- `PUT /api/admin/content/hero` の rules（`headline` 必須、`image_url` は文字列 or null）
- 非 admin は 403
- 不正な `key`（`foo`）は 404
- `PUT` 後に `updated_by` がセットされる
