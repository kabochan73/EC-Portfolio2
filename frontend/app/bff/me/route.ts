// ブラウザ → GET/PUT /bff/me → Laravel GET/PUT /api/me。
// GET: AccountLink がログイン状態を確認する。PUT: /account/profile の氏名・メール変更。

import { NextResponse } from "next/server";

import { fetchCurrentUser, updateProfile } from "@/lib/auth";
import { withSession } from "@/lib/bff";

export async function GET() {
  return withSession(async (token) => NextResponse.json({ data: await fetchCurrentUser(token) }));
}

export async function PUT(request: Request) {
  const body = await request.json();

  return withSession(async (token) => NextResponse.json({ data: await updateProfile(token, body) }));
}
