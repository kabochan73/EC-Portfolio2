// ブラウザ → PUT /bff/me/password → Laravel PUT /api/me/password（204）。

import { updatePassword } from "@/lib/auth";
import { noContent, withSession } from "@/lib/bff";

export async function PUT(request: Request) {
  const body = await request.json();

  return withSession(async (token) => {
    await updatePassword(token, body);
    return noContent();
  });
}
