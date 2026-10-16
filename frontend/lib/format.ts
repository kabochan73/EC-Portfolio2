// 表示用の整形（R4 で新設）。R3 は `¥{price.toLocaleString("ja-JP")}` を 28 か所に、
// 日付の整形関数を一覧・詳細・管理画面のファイルごとに直接書いていた。

/** 円の金額を「¥12,000」の形にする */
export function formatYen(amount: number): string {
  return `¥${amount.toLocaleString("ja-JP")}`;
}

/**
 * 日時はすべて日本時間で表示する（R4 修正）。R3 は timeZone を指定せずに toLocaleString していたので、
 * Server Component（= サーバーのコンテナは UTC）で描くと 9 時間ずれていた
 * （JST 10/16 8:00 の注文が「10/15 23:00」と表示される）
 */
const TIME_ZONE = "Asia/Tokyo";

/** 「2026/10/16」 */
export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ja-JP", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

/** 「2026/10/16 8:00:00」 */
export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ja-JP", { timeZone: TIME_ZONE });
}
