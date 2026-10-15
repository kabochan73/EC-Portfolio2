<?php

// EC サイト固有のマジックナンバーをここに集約する（docs/06-laravel-design.md §7）。
// コード中に閾値・日数・金額を直接書かず、必ず config('shop.xxx') を参照する。

return [

    // 在庫が この数値以下なら「残りわずか（low_stock）」表示にする
    // （docs/02-database-design.md の LOW_STOCK_THRESHOLD）
    'low_stock_threshold' => 5,

    // created_at からこの日数以内なら「新着（is_new）」扱い
    'new_product_days' => 30,

    // 送料（一律）と、送料無料になる小計のしきい値
    'shipping_fee' => 800,
    'free_shipping_threshold' => 20000,

    // 1明細あたりの最大注文数量（不正・誤操作による大量注文を防ぐ簡易な上限）
    'cart_max_quantity_per_line' => 10,

    // 未決済（pending）注文の有効期限（分）。過ぎたら orders:expire-pending がキャンセルして在庫を戻す
    'pending_order_ttl_minutes' => 30,

    // 注文番号のプレフィックス（EC-YYYYMMDD-NNNN）
    'order_number_prefix' => 'EC',

    // 決済通貨（Stripe に渡す currency。JPY はゼロ小数なので amount は円そのまま）
    'currency' => 'jpy',

];
