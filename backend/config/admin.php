<?php

/*
|--------------------------------------------------------------------------
| 管理者アカウント（AdminUserSeeder が使う）
|--------------------------------------------------------------------------
| 認証情報は .env に置き、リポジトリには入れない。未設定ならローカル用の
| デフォルトにフォールバックする。config 経由で読むこと（本番は config:cache
| が効くので seeder 内の env() は null になる）。
|
| env('X', 既定値) の既定値は「変数が無いとき」にしか使われず、.env.example の
| `ADMIN_EMAIL=` のように「空で書いてある」と空文字が返る。空でも既定値に
| 落ちるよう ?: を使う（R3 は env() の第2引数だったので空のとき効かなかった）。
*/

return [
    'name' => env('ADMIN_NAME') ?: 'Store Admin',
    'email' => env('ADMIN_EMAIL') ?: 'admin@ec-portfolio.example.jp',
    'password' => env('ADMIN_PASSWORD') ?: 'password',
];
