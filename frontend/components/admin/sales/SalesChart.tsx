"use client";

import Link from "next/link";
import { useState } from "react";

import { rankingHref } from "@/components/admin/sales/RankingMonthNav";
import { formatYen } from "@/lib/format";
import type { DailyRevenue, MonthlyRevenue } from "@/lib/types";

type Props = {
  daily: DailyRevenue[];
  monthly: MonthlyRevenue[];
  /** ランキングで表示中の月（月別で濃く塗る） */
  selectedMonth: string;
  /** ?month= 付きで開いたときは月別から見せる */
  initialMode: "daily" | "monthly";
};

type Bar = { key: string; label: string; title: string; revenue: number };

/**
 * 売上の棒グラフ（Client Component。R4 の新機能）。グラフのライブラリは使わず div で描く（docs/05）。
 * - 棒の高さ = その期間の売上 ÷ 期間内の最大値（%）
 * - 日別 ⇔ 月別の切り替えは useState だけ。データは両方とも props で受け取り済みなので再取得しない
 * - マウスを乗せると金額を出す。目盛りは最大値と 0 だけ
 * - 月別の棒を押すと、その月のランキングに切り替わる（/admin/sales?month=…。R4 追加 2026-10-17）。
 *   ランキングで表示中の月の棒を濃く、ほかを薄くする
 */
export default function SalesChart({ daily, monthly, selectedMonth, initialMode }: Props) {
  const [mode, setMode] = useState<"daily" | "monthly">(initialMode);
  const months = monthly.map((m) => m.month);

  const bars: Bar[] =
    mode === "daily"
      ? daily.map((d) => ({
          key: d.date,
          label: String(Number(d.date.slice(8))), // "01" → "1"
          title: d.date.replaceAll("-", "/"),
          revenue: d.revenue,
        }))
      : monthly.map((m) => ({
          key: m.month,
          label: `${Number(m.month.slice(5))}月`,
          title: m.month.replace("-", "/"),
          revenue: m.revenue,
        }));

  const max = Math.max(0, ...bars.map((bar) => bar.revenue));
  // 日別は最大 31 本あるので、ラベルは 1・5・10・15・20・25・30 日だけ出す
  // （月末も出すと、スマホの幅で 30 と 31 がくっついて「3031」に見えた）
  const showLabel = (index: number) => mode === "monthly" || index === 0 || (index + 1) % 5 === 0;

  return (
    <div className="border border-ink p-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 className="text-[11px] tracking-widest text-graphite uppercase">
          {mode === "daily" ? "Daily Revenue (This Month)" : "Monthly Revenue (Last 12 Months)"}
        </h2>
        <div className="flex border border-ink text-[10px] tracking-widest uppercase">
          {(["daily", "monthly"] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={mode === value}
              onClick={() => setMode(value)}
              className={`px-3 py-1 ${mode === value ? "bg-ink text-paper" : "hover:bg-mist"}`}
            >
              {value === "daily" ? "日別" : "月別"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        {/* 目盛り（最大値と 0 だけ） */}
        <div className="flex h-48 flex-col justify-between text-right text-[10px] text-graphite">
          <span>{formatYen(max)}</span>
          <span>¥0</span>
        </div>

        <div className="min-w-0 flex-1">
          {/* 日別はただの絵（role="img"）。月別は棒がリンクなので、まとまり（role="group"）にする */}
          <div
            className="flex h-48 items-end gap-px border-b border-l border-ink"
            role={mode === "daily" ? "img" : "group"}
            aria-label={
              mode === "daily"
                ? `日別の売上。最大 ${formatYen(max)}`
                : `月別の売上。最大 ${formatYen(max)}。棒を押すとその月のランキングを表示`
            }
          >
            {bars.map((bar) => {
              const height = max > 0 ? `${(bar.revenue / max) * 100}%` : "0%";
              const label = `${bar.title} ${formatYen(bar.revenue)}`;
              const tooltip = (
                <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 border border-ink bg-paper px-2 py-1 text-[10px] whitespace-nowrap group-hover:block">
                  {label}
                </span>
              );

              if (mode === "daily") {
                return (
                  <div key={bar.key} className="group relative flex h-full flex-1 items-end" title={label}>
                    <div className="w-full bg-ink transition-opacity group-hover:opacity-60" style={{ height }} />
                    {tooltip}
                  </div>
                );
              }

              const selected = bar.key === selectedMonth;
              return (
                <Link
                  key={bar.key}
                  href={rankingHref(bar.key, months)}
                  scroll={false}
                  aria-label={`${label}（${bar.title} のランキングを見る）`}
                  aria-current={selected ? "true" : undefined}
                  className="group relative flex h-full flex-1 items-end"
                >
                  <div
                    className={`w-full bg-ink transition-opacity group-hover:opacity-60 ${selected ? "" : "opacity-30"}`}
                    style={{ height }}
                  />
                  {tooltip}
                </Link>
              );
            })}
          </div>

          <div className="mt-1 flex gap-px text-[10px] text-graphite">
            {bars.map((bar, index) => (
              <span key={bar.key} className="flex-1 text-center">
                {showLabel(index) ? bar.label : ""}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
