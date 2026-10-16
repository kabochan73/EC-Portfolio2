// 会員（backend/app/Http/Resources/Account/*）。

// Account/UserResource（GET /api/me・register・login）
export type User = {
  id: number;
  name: string;
  email: string;
  role: "customer" | "admin";
};

// Account/AddressResource（住所録）
export type Address = {
  id: number;
  recipient_name: string;
  postal_code: string;
  prefecture: string;
  city: string;
  address_line1: string;
  address_line2: string | null;
  phone: string;
  is_default: boolean;
};
