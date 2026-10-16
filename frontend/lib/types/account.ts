// 会員（backend/app/Http/Resources/Account/*）。

// Account/UserResource（GET /api/me・register・login）
export type User = {
  id: number;
  name: string;
  email: string;
  role: "customer" | "admin";
};
