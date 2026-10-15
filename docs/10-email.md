# トランザクションメール（R4）

## 方針

- **ローカル = Mailpit（SMTP）** / **本番 = Resend**。切り替えは `MAIL_MAILER` のみ。
- Laravel Mail + **Markdown Mailable**（`resources/views/mail/*.blade.php`）。デザインはモノトーンで簡素（Laravel 標準の Markdown コンポーネントの色を上書き）。
- 送信は**キュー経由**（`ShouldQueue` な Job から）。リクエストを待たせない。worker が落ちてもメールが遅延するだけ。
- 宛先は常に実ユーザーのメール。ポートフォリオなので実運用の宛先は自分だけ。**Resend はドメイン未検証のため `onboarding@resend.dev` から送信 = アカウント所有者宛にしか届かない**（`docs/04-deployment-railway.md`）。
- **メール認証（アドレス確認）は実装しない**（2026-09-14 撤去。ポートフォリオ用途のため、登録だけで購入まで一通り体験できるようにする方を優先した。`docs/rebuild-log.md`）。

## Mailable 一覧

| クラス | トリガ | 内容 | キュー |
|---|---|---|---|
| `ResetPasswordMail` | `POST /api/forgot-password` | リセットリンク（`${FRONTEND_URL}/reset-password?token=..&email=..`）。有効期限を明記 | `SendPasswordResetJob` |
| `OrderConfirmationMail` | Webhook `payment_intent.succeeded` → `MarkOrderPaid` | 注文番号・明細・送料・合計・配送先・`VIEW ORDER` リンク | `SendOrderConfirmationJob` |
| `OrderShippedMail` | admin が `paid → shipped` | 注文番号・「発送しました」・配送先・`VIEW ORDER` リンク（追跡番号は R3 では持たない） | `SendOrderShippedJob` |

## パスワードリセットの送信経路

`Password::sendResetLink()`（標準 broker）→ `$user->sendPasswordResetNotification($token)` を `User` モデルで override し、標準の `Notification` は使わず自前 Job を dispatch する（4 通の見た目を Mailable + Markdown ビューで揃えたいため）:

```php
// User.php
public function sendPasswordResetNotification($token): void
{
    SendPasswordResetJob::dispatch($this->id, $token);
}
```

`SendPasswordResetJob::handle()` がフロント向け URL（`${FRONTEND_URL}/reset-password?token=..&email=..`）を自前で組み立てて `ResetPasswordMail` を送る。`config/auth.php` の `passwords.users.expire`（分）を本文に埋め込む。

注文確認・発送通知も同じ形（`App\Actions\Admin\Order\TransitionOrderStatus` / Webhook ハンドラが `SendOrderConfirmationJob` / `SendOrderShippedJob` を dispatch）。

## `config/mail.php` / `config/services.php`

```php
// config/mail.php
'default' => env('MAIL_MAILER', 'log'),
'mailers' => [
    'smtp' => [ /* Mailpit。host=mailpit port=1025 encryption=null auth なし */ ],
    'resend' => ['transport' => 'resend'],
    'log' => ['transport' => 'log', 'channel' => 'stderr'],
],
'from' => [
    'address' => env('MAIL_FROM_ADDRESS', 'noreply@ec-portfolio.example.jp'),
    'name' => env('MAIL_FROM_NAME', 'EC-PORTFOLIO'),
],
```

Resend トランスポートは `composer require resend/resend-php` のみで有効になる（`config/mail.php` の `resend` mailer・`config/services.php` の `resend.key` は Laravel 12 標準で既にある）。

`RESEND_API_KEY` 未設定・`MAIL_MAILER=log` でも全フローが動く（メールはログに出るだけ）。ローカルは Mailpit を既定にする。

## メールのトーン・デザイン

- 件名: `[EC-PORTFOLIO] ご注文ありがとうございます (EC-20260907-0001)` のような形。全部日本語。
- 本文: Markdown。`php artisan vendor:publish --tag=laravel-mail` でコンポーネントを取り出し、`resources/views/vendor/mail/html/themes/default.css` をモノトーン化（プライマリボタンを黒背景・白文字・角丸なし、リンクは黒下線、パネルはボーダーのみ）。
- ロゴ画像は使わず `EC-PORTFOLIO` のテキスト。
- フッターにダミーの問い合わせ先（`docs/01` のフッターと同じ `example.jp`）。

## キュー（`docs/06` §5 と対）

- `QUEUE_CONNECTION=database`。Job は `implements ShouldQueue`, `use Queueable`。
- Job のペイロードは **ID のみ**（`userId` / `orderId`）。`handle()` でモデルを引く。
- `--tries=3`。失敗は `failed_jobs`。`failed()` で `Log::warning`（注文自体は成立しているのでメール失敗は致命的でない）。
- テスト: `Mail::fake()` + `Queue::fake()`。
  - 「`forgot-password` で `SendPasswordResetJob` が push される」
  - 「Webhook succeeded で `SendOrderConfirmationJob` が push される」
  - 「`OrderConfirmationMail` が正しい宛先・件名・注文番号を含む」（`Mail::assertQueued(fn ($mail) => $mail->hasTo($user->email) && ...)`）

## セキュリティ・運用メモ

- `forgot-password` のレスポンスは常に成功文言（アカウント存在を漏らさない）。メールが飛ぶかどうかで差が出ないよう、存在しないアドレスでも同じ 200 + 遅延なし。
- リセットリンクはトークン付き・60 分（`config/auth.php` の `passwords.users.expire`）。
- メール本文に生のトークンが載る以上、Mailpit / Resend のログ管理に注意（ポートフォリオなので許容）。
- バウンス・苦情処理はしない（実顧客がいない）。
