import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import SalesChart from "@/components/admin/sales/SalesChart";
import type { DailyRevenue, MonthlyRevenue } from "@/lib/types";

// R4 の新機能（売上ダッシュボード）の棒グラフ。ライブラリを使わず div の高さで描いている

/** 10 月の 31 日分。指定した日だけ売上を入れる */
function october(revenues: Record<number, number>): DailyRevenue[] {
  return Array.from({ length: 31 }, (_, i) => ({
    date: `2026-10-${String(i + 1).padStart(2, "0")}`,
    revenue: revenues[i + 1] ?? 0,
  }));
}

const monthly: MonthlyRevenue[] = Array.from({ length: 12 }, (_, i) => {
  const month = ((10 + i) % 12) + 1; // 2025-11 〜 2026-10
  const year = month >= 11 ? 2025 : 2026;
  return { month: `${year}-${String(month).padStart(2, "0")}`, revenue: month === 10 ? 50000 : month === 9 ? 25000 : 0 };
});

/** 棒の高さ（style.height）を順番に */
function barHeights(): string[] {
  const chart = screen.getByRole("img");
  return [...chart.children].map((bar) => (bar.firstElementChild as HTMLElement).style.height);
}

describe("SalesChart", () => {
  it("日別: 31 本。一番売れた日が 100%、ほかは最大値との比", () => {
    render(<SalesChart daily={october({ 1: 24000, 16: 48000 })} monthly={monthly} />);

    const heights = barHeights();
    expect(heights).toHaveLength(31);
    expect(heights[15]).toBe("100%"); // 16 日
    expect(heights[0]).toBe("50%"); // 1 日
    expect(heights[1]).toBe("0%");
    expect(screen.getByRole("img")).toHaveAccessibleName("日別の売上。最大 ¥48,000");
  });

  it("月別に切り替えると 12 本・ラベルは「n月」（データは取り直さない）", async () => {
    const user = userEvent.setup();
    render(<SalesChart daily={october({})} monthly={monthly} />);

    await user.click(screen.getByRole("button", { name: "月別" }));

    expect(screen.getByRole("button", { name: "月別" })).toHaveAttribute("aria-pressed", "true");
    expect(barHeights()).toHaveLength(12);
    expect(barHeights().slice(-2)).toEqual(["50%", "100%"]); // 9 月・10 月
    expect(screen.getByText("11月")).toBeInTheDocument();
    expect(screen.getByText("10月")).toBeInTheDocument();
  });

  it("日別のラベルは 1・5・10…30 だけ（31 は出さない。スマホで 30 とくっつくため）", () => {
    render(<SalesChart daily={october({})} monthly={monthly} />);
    const labels = [...screen.getByRole("img").nextElementSibling!.children].map((s) => s.textContent).filter(Boolean);
    expect(labels).toEqual(["1", "5", "10", "15", "20", "25", "30"]);
  });

  it("売上が 1 件も無い期間は全部 0%（0 で割らない）", () => {
    render(<SalesChart daily={october({})} monthly={monthly} />);
    expect(new Set(barHeights())).toEqual(new Set(["0%"]));
  });
});
