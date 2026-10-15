@component('mail::message')
# パスワード再設定

{{ $recipientName }} 様

パスワード再設定のリクエストを受け付けました。
下のボタンから新しいパスワードを設定してください。

@component('mail::button', ['url' => $resetUrl])
パスワードを再設定する
@endcomponent

このリンクは {{ $expiresMinutes }} 分で無効になります。
心当たりがない場合は、このメールを破棄してください。パスワードは変更されません。

EC-PORTFOLIO
@endcomponent
