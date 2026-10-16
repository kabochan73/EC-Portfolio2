// ─────────────────────────────────────────────────────────────
// 認証まわりのサーバー側専用ヘルパー（Route Handler / Server Component から使う）。
// - Cookie 管理: トークンは httpOnly Cookie に入れ、ブラウザの JS からは触れない
// - Laravel 呼び出し: app/bff/**/route.ts を薄く保てるよう実処理はここに置く
// プロフィール更新・パスワード変更・パスワードリセットは、それを使う Step（37 / 39）で足す。
// ─────────────────────────────────────────────────────────────

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { NextResponse } from "next/server";

import { ApiError, apiFetch } from "@/lib/api";
import { SESSION_COOKIE_NAME } from "@/lib/constants";
import type { LoginFormValues } from "@/lib/schemas/login";
import type { RegisterFormValues } from "@/lib/schemas/register";
import type { ApiResource, User } from "@/lib/types";

const THIRTY_DAYS_SECONDS = 60 * 60 * 24 * 30;

type AuthResult = { user: User; token: string };

/** Server Component / Route Handler から、ログイン中のトークンを読む */
export async function getSessionToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(SESSION_COOKIE_NAME)?.value;
}

/** ログイン / 会員登録成功時。httpOnly / secure(本番のみ) / sameSite=lax / 30日（docs/08 §4） */
export function setSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: THIRTY_DAYS_SECONDS,
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.delete(SESSION_COOKIE_NAME);
}

/**
 * IP 単位でレート制限される公開エンドポイント（登録・ログイン・パスワードリセット）向け。
 * Laravel から見ると接続元は常にこのサーバーなので、実クライアントの IP を
 * X-Client-IP で渡す。共有シークレットが一致したときだけ Laravel が信用する
 * （backend の ResolveBffClientIp）。IP は Railway エッジが付ける X-Real-IP。
 */
async function clientIpHeaders(): Promise<Record<string, string>> {
  const secret = process.env.BFF_SHARED_SECRET;
  const clientIp = (await headers()).get("x-real-ip");
  if (!secret || !clientIp) {
    return {};
  }
  return { "X-Client-IP": clientIp, "X-BFF-Secret": secret };
}

/**
 * 公開エンドポイントへの JSON の POST（R4）。R3 は Content-Type と実 IP ヘッダーの組み立てを
 * register / login / forgot / reset の関数ごとに書いていた
 */
async function publicPost(body: unknown): Promise<RequestInit> {
  return {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await clientIpHeaders()) },
    body: JSON.stringify(body),
  };
}

/** ログイン中のトークンを付ける */
function bearer(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

/** POST /api/register */
export async function registerUser(payload: RegisterFormValues): Promise<AuthResult> {
  const result = await apiFetch<ApiResource<User> & { token: string }>(
    "/api/register",
    await publicPost(payload),
  );
  return { user: result.data, token: result.token };
}

/** POST /api/login */
export async function loginUser(payload: LoginFormValues): Promise<AuthResult> {
  const result = await apiFetch<ApiResource<User> & { token: string }>(
    "/api/login",
    await publicPost(payload),
  );
  return { user: result.data, token: result.token };
}

/** POST /api/logout。現在のトークンだけ失効 */
export async function logoutUser(token: string): Promise<void> {
  await apiFetch("/api/logout", { method: "POST", headers: bearer(token) });
}

/** GET /api/me */
export async function fetchCurrentUser(token: string): Promise<User> {
  const result = await apiFetch<ApiResource<User>>("/api/me", { headers: bearer(token) });
  return result.data;
}

/**
 * 要ログインの Server Component（/account 系・/checkout 系）の先頭で呼ぶ。
 * middleware は Cookie の有無しか見ないので、ここでトークンの有効性まで確認し、
 * 無い/失効していれば /login?redirect=<戻り先> へ飛ばす。
 */
export async function requireAuth(redirectTo: string): Promise<AuthResult> {
  const loginPath = `/login?redirect=${encodeURIComponent(redirectTo)}`;
  const token = await getSessionToken();

  if (!token) {
    redirect(loginPath);
  }

  try {
    const user = await fetchCurrentUser(token);
    return { user, token };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      redirect(loginPath);
    }
    throw error;
  }
}
