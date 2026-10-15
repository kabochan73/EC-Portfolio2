// ─────────────────────────────────────────────────────────────
// Laravel API を呼ぶための共通ヘルパー（サーバー側専用）。
//
// BFF 構成なので、このファイルの関数は必ず「サーバー側」
// （Server Component / Route Handler / Server Action）から呼ぶこと。
// ブラウザから import すると API_URL が undefined になる
// （NEXT_PUBLIC_ が付かない環境変数はクライアントに渡らない）。
//
// 認証トークンの付与（lib/auth.ts）と ISR タグ（lib/revalidate.ts）は
// それぞれの機能を作る Step で足していく。
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";

// Laravel のベース URL。
// ローカル: http://backend:8080（compose のコンテナ名。frontend/.env.local）
// 本番:     http://backend.railway.internal:8080（Railway 内部ネットワーク）
const API_URL = process.env.API_URL;

/**
 * Laravel が非 2xx を返したときに投げる例外。
 * - status … 呼び出し側の分岐用（例: 404 だけ notFound()）
 * - body … Laravel が返した JSON（422 の { message, errors } 等）。
 *   BFF がこれをそのままブラウザへ中継すればフォームにフィールドエラーを出せる。
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Laravel API を叩いて JSON を返す。
 *
 * @param path  "/api/health" のような先頭スラッシュ付きのパス
 * @param init  fetch の追加オプション（method / headers / body / next など）
 */
export async function apiFetch<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  if (!API_URL) {
    throw new Error("API_URL が未設定です（docker-compose.yml / .env.local を確認）");
  }

  // 既定は毎回最新（個人化データ）。カタログ・CMS は呼び出し側が next: { tags, revalidate }
  // を渡す。その場合は cache: 'no-store' を付けない（両者は排他。ISR タグが効かなくなる）。
  const usesIsr = init?.next !== undefined;

  const res = await fetch(`${API_URL}${path}`, {
    ...(usesIsr ? {} : { cache: "no-store" as const }),
    ...init,
    headers: {
      Accept: "application/json",
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    let body: unknown = text;
    try {
      body = JSON.parse(text);
    } catch {
      // JSON でなければ生テキストのまま
    }
    throw new ApiError(
      res.status,
      `API ${path} が ${res.status} を返しました: ${text.slice(0, 200)}`,
      body,
    );
  }

  // 204 No Content は本文が空
  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

/**
 * BFF Route Handler（app/bff/**\/route.ts）向け。ApiError をそのまま
 * Laravel と同じ形・同じステータスでブラウザに返す。
 * ApiError 以外は投げ直す（想定外なので呼び出し元で気づけるように）。
 */
export function apiErrorResponse(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json(
      error.body ?? { message: error.message },
      { status: error.status },
    );
  }
  throw error;
}
