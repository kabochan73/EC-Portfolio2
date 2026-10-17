import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import OrderStatusActions from "@/components/admin/OrderStatusActions";
import type { OrderStatus } from "@/lib/types";

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

let confirmSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  refresh.mockReset();
  confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const buttonNames = () => screen.queryAllByRole("button").map((b) => b.textContent);

describe("OrderStatusActions — 状態ごとのボタン（R4: キャンセルの文言を状態で分けた）", () => {
  it.each<[OrderStatus, string[]]>([
    ["pending", ["Cancel Order"]],
    ["paid", ["Mark as Shipped", "Cancel & Refund"]],
    ["shipped", ["Mark as Completed", "Cancel"]],
  ])("%s: %j", (status, expected) => {
    render(<OrderStatusActions orderNumber="EC-1" status={status} />);
    expect(buttonNames()).toEqual(expected);
  });

  it.each<OrderStatus>(["completed", "cancelled"])("%s: ボタンなし・変更できない旨を出す", (status) => {
    render(<OrderStatusActions orderNumber="EC-1" status={status} />);
    expect(buttonNames()).toEqual([]);
    expect(screen.getByText(/これ以上変更できません/)).toBeInTheDocument();
  });
});

describe("OrderStatusActions — 実行", () => {
  it("Mark as Shipped → PUT → 成功なら router.refresh（確認ダイアログは出さない）", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<OrderStatusActions orderNumber="EC-20261016-0001" status="paid" />);
    await user.click(screen.getByRole("button", { name: "Mark as Shipped" }));

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(
      "/bff/admin/orders/EC-20261016-0001/status",
      expect.objectContaining({ method: "PUT", body: JSON.stringify({ status: "shipped" }) }),
    );
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("キャンセルの確認文は状態で変わる（paid は返金・shipped は在庫を戻さない）", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    const user = userEvent.setup();

    const { unmount } = render(<OrderStatusActions orderNumber="EC-1" status="paid" />);
    await user.click(screen.getByRole("button", { name: "Cancel & Refund" }));
    expect(confirmSpy).toHaveBeenLastCalledWith(expect.stringContaining("返金"));
    unmount();

    render(<OrderStatusActions orderNumber="EC-1" status="shipped" />);
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(confirmSpy).toHaveBeenLastCalledWith(expect.stringContaining("在庫は戻しません"));
  });

  it("確認ダイアログでやめたら送らない", async () => {
    confirmSpy.mockReturnValue(false);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<OrderStatusActions orderNumber="EC-1" status="pending" />);
    await user.click(screen.getByRole("button", { name: "Cancel Order" }));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("失敗したら Laravel のメッセージを出し、refresh しない", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, json: async () => ({ message: "「shipped」から「completed」へは変更できません。" }) }),
    );
    const user = userEvent.setup();

    render(<OrderStatusActions orderNumber="EC-1" status="shipped" />);
    await user.click(screen.getByRole("button", { name: "Mark as Completed" }));

    expect(await screen.findByText(/変更できません/)).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });
});
