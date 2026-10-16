// ブラウザ → PUT/DELETE /bff/addresses/{id} → Laravel /api/addresses/{id}。他人の id は Laravel が 404。

import { NextResponse } from "next/server";

import { deleteAddress, updateAddress } from "@/lib/addresses";
import { noContent, withSession } from "@/lib/bff";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Ctx) {
  const { id } = await params;
  const body = await request.json();

  return withSession(async (token) =>
    NextResponse.json({ data: await updateAddress(token, Number(id), body) }),
  );
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const { id } = await params;

  return withSession(async (token) => {
    await deleteAddress(token, Number(id));
    return noContent();
  });
}
