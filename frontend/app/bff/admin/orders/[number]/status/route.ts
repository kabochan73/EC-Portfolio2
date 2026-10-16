// ブラウザ → PUT /bff/admin/orders/{number}/status → Laravel の同じパス。
// 不正な遷移（422）や決済の処理中（409）は Laravel のメッセージをそのまま返す

import { NextResponse } from "next/server";

import { updateOrderStatus } from "@/lib/admin/orders";
import { withSession } from "@/lib/bff";
import { revalidate, tags } from "@/lib/revalidate";

type Context = { params: Promise<{ number: string }> };

export async function PUT(request: Request, { params }: Context) {
  const { number } = await params;
  const { status } = await request.json();
  return withSession(async (token) => {
    const order = await updateOrderStatus(token, number, status);

    // R4: キャンセルで在庫が戻ると「売り切れ」が解ける。商品一覧と、明細の商品ページのキャッシュを消す
    // （R3 は消していなかったので、最大 10 分ほど売り切れのまま表示されることがあった）
    if (order.status === "cancelled") {
      const slugs = order.items.flatMap((item) => (item.product_slug ? [tags.product(item.product_slug)] : []));
      revalidate(tags.products, ...slugs);
    }

    return NextResponse.json({ data: order });
  });
}
