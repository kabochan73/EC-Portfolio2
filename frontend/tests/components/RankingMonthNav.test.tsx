import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import RankingMonthNav from "@/components/admin/sales/RankingMonthNav";

// ランキングの「‹ 2026/09 ›」（R4 追加 2026-10-17）。選べるのは月別グラフと同じ過去 12 か月

const months = ["2025-11", "2025-12", "2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"];

describe("RankingMonthNav", () => {
  it("前の月・次の月へのリンク。今月へ戻るときは ?month= を付けない", () => {
    render(<RankingMonthNav month="2026-09" months={months} />);

    expect(screen.getByText("2026/09")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "2026/08 のランキング" })).toHaveAttribute("href", "/admin/sales?month=2026-08");
    expect(screen.getByRole("link", { name: "2026/10 のランキング" })).toHaveAttribute("href", "/admin/sales");
  });

  it("今月は「次」が無く、12 か月前は「前」が無い", () => {
    const { rerender } = render(<RankingMonthNav month="2026-10" months={months} />);
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.getByRole("link")).toHaveAccessibleName("2026/09 のランキング");

    rerender(<RankingMonthNav month="2025-11" months={months} />);
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.getByRole("link")).toHaveAccessibleName("2025/12 のランキング");
  });
});
