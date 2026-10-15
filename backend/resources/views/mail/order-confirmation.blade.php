@component('mail::message')
# ご注文ありがとうございます

ご注文を承りました。注文番号は **{{ $order->order_number }}** です。

@component('mail::table')
| 商品 | 数量 | 小計 |
|:-----|:----:|-----:|
@foreach ($order->items as $item)
| {{ $item->product_name }}（{{ $item->variant_size }}{{ $item->variant_color ? ' / '.$item->variant_color : '' }}） | {{ $item->quantity }} | ¥{{ number_format($item->line_total) }} |
@endforeach
@endcomponent

- 小計: ¥{{ number_format($order->subtotal) }}
- 送料: {{ $order->shipping_fee === 0 ? '無料' : '¥'.number_format($order->shipping_fee) }}
- **合計: ¥{{ number_format($order->total) }}**

**お届け先**
{{ $order->ship_recipient_name }}
〒{{ $order->ship_postal_code }} {{ $order->ship_prefecture }}{{ $order->ship_city }}
{{ $order->ship_address_line1 }}{{ $order->ship_address_line2 ? ' '.$order->ship_address_line2 : '' }}
{{ $order->ship_phone }}

@component('mail::button', ['url' => $orderUrl])
注文の詳細を見る
@endcomponent

EC-PORTFOLIO
@endcomponent
