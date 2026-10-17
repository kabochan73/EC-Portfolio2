import Link from "next/link";

type Props = {
  /** 表示中のランキングの月（"2026-09"） */
  month: string;
  /** 選べる月（月別グラフと同じ過去 12 か月。古い順） */
  months: string[];
};

/** "2026-09" → "2026/09" */
export function formatMonth(month: string): string {
  return month.replace("-", "/");
}

/** ランキングの月の URL（今月は ?month= を付けない） */
export function rankingHref(month: string, months: string[]): string {
  return month === months.at(-1) ? "/admin/sales" : `/admin/sales?month=${month}`;
}

/**
 * ランキングの「‹ 2026/09 ›」（Server Component。R4 追加 2026-10-17）。
 * ただのリンクなので Client Component はいらない（月は URL の ?month= で表し、page が読む。docs/08 §3.6）。
 * scroll={false} で、押してもページの先頭に飛ばない
 */
export default function RankingMonthNav({ month, months }: Props) {
  const index = months.indexOf(month);
  const prev = index > 0 ? months[index - 1] : null;
  const next = index >= 0 && index < months.length - 1 ? months[index + 1] : null;
  const arrowClass = "px-2 py-1 transition-colors hover:bg-mist";

  return (
    <nav className="flex items-center gap-2 text-xs tracking-widest" aria-label="ランキングの月">
      {prev ? (
        <Link href={rankingHref(prev, months)} scroll={false} className={arrowClass} aria-label={`${formatMonth(prev)} のランキング`}>
          ‹
        </Link>
      ) : (
        <span className="px-2 py-1 text-graphite opacity-40">‹</span>
      )}
      <span className="min-w-16 text-center">{formatMonth(month)}</span>
      {next ? (
        <Link href={rankingHref(next, months)} scroll={false} className={arrowClass} aria-label={`${formatMonth(next)} のランキング`}>
          ›
        </Link>
      ) : (
        <span className="px-2 py-1 text-graphite opacity-40">›</span>
      )}
    </nav>
  );
}
