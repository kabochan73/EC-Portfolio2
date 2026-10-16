// 表示用の整形（R4 で新設）。R3 は `¥{price.toLocaleString("ja-JP")}` を 28 か所に直接書いていた。

/** 円の金額を「¥12,000」の形にする */
export function formatYen(amount: number): string {
  return `¥${amount.toLocaleString("ja-JP")}`;
}
