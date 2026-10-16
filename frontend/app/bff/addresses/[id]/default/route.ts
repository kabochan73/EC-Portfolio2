// ブラウザ → POST /bff/addresses/{id}/default → Laravel（「いつも使う住所」に設定）。

import { NextResponse } from "next/server";

import { setDefaultAddress } from "@/lib/addresses";
import { withSession } from "@/lib/bff";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Ctx) {
  const { id } = await params;

  return withSession(async (token) =>
    NextResponse.json({ data: await setDefaultAddress(token, Number(id)) }),
  );
}
