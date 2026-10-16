// 注文（backend/app/Http/Resources/Order/* と backend/app/Enums/OrderStatus.php）。

/** backend/app/Enums/OrderStatus.php */
export type OrderStatus = "pending" | "paid" | "shipped" | "completed" | "cancelled";

/** 注文時点の配送先のコピー（orders.ship_*） */
export type ShippingAddressSnapshot = {
  recipient_name: string;
  postal_code: string;
  prefecture: string;
  city: string;
  address_line1: string;
  address_line2: string | null;
  phone: string;
};

// Order/OrderItemResource（明細のスナップショット）
export type OrderItem = {
  id: number;
  product_name: string;
  product_slug: string | null;
  size: string;
  color: string | null;
  image_url: string | null;
  unit_price: number;
  quantity: number;
  line_total: number;
};

// Order/OrderResource（GET /api/orders/{number}・POST /api/orders）
export type OrderDetail = {
  order_number: string;
  status: OrderStatus;
  subtotal: number;
  shipping_fee: number;
  total: number;
  placed_at: string | null;
  paid_at: string | null;
  shipped_at: string | null;
  cancelled_at: string | null;
  shipping_address: ShippingAddressSnapshot;
  items: OrderItem[];
  payment?: { status: string; last_error: string | null } | null;
};

// Order/OrderListResource（GET /api/orders）
export type OrderListItem = {
  order_number: string;
  status: OrderStatus;
  total: number;
  /** 明細の数量の合計（行数ではない） */
  item_count: number;
  placed_at: string | null;
};

/**
 * POST /api/orders の本文（backend の StoreOrderRequest）。フォームそのものではなく、
 * カートと配送先の選択から組み立てる API の入力なので、ここに置く（docs/08 §7）
 */
export type CreateOrderRequest = {
  items: { variant_id: number; quantity: number }[];
  /** 住所録の住所を使うとき */
  address_id?: number;
  /** 新しい住所を入力したとき（AddressFormValues と同じ形。is_default は送らない） */
  address?: Omit<ShippingAddressSnapshot, "address_line2"> & { address_line2?: string | null };
  save_address?: boolean;
};

// POST /api/checkout/payment-intent（backend の CreatePaymentIntent）
export type PaymentIntentResponse = {
  client_secret: string;
  publishable_key: string;
};
