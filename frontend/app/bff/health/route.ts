// ─────────────────────────────────────────────────────────────
// BFF の疎通確認用エンドポイント。
//
//   ブラウザ → GET /bff/health（このファイル・Next.js のサーバー側）
//            → GET {API_URL}/api/health（Laravel）
//            → PostgreSQL
//
// この1本が通れば「ブラウザは Next だけを見て、Next が Laravel を、
// Laravel が DB を見る」という BFF の経路が確立できている。
// ブラウザが触る Route Handler は全部 app/bff/ 配下に置くルール。
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api";

// Laravel の /api/health が返す JSON の形（backend/routes/api.php と揃える）
type LaravelHealth = {
  status: string;
  app: string;
  database: string;
  time: string;
};

export async function GET() {
  try {
    const backend = await apiFetch<LaravelHealth>("/api/health");

    return NextResponse.json({
      status: "ok",
      frontend: "ok",
      backend,
    });
  } catch (error) {
    // Laravel が落ちている / URL 違い / DB 未起動 などはここに来る
    return NextResponse.json(
      {
        status: "error",
        frontend: "ok",
        backend: null,
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 502 }, // Bad Gateway = 上流（Laravel）に繋がらなかった
    );
  }
}
