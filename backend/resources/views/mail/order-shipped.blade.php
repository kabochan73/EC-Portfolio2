@component('mail::message')
# 商品を発送しました

ご注文 **{{ $order->order_number }}** の商品を発送しました。

**お届け先**
{{ $order->ship_recipient_name }}
〒{{ $order->ship_postal_code }} {{ $order->ship_prefecture }}{{ $order->ship_city }}
{{ $order->ship_address_line1 }}{{ $order->ship_address_line2 ? ' '.$order->ship_address_line2 : '' }}

到着まで通常 3〜5 営業日です。

@component('mail::button', ['url' => $orderUrl])
注文の詳細を見る
@endcomponent

EC-PORTFOLIO
@endcomponent
