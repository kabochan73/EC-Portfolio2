import { describe, expect, it } from "vitest";

import { formatDate, formatDateTime, formatYen } from "@/lib/format";

// vitest.config.mts で TZ=UTC にしている（サーバーのコンテナと同じ）。
// R3 は timeZone を指定していなかったので、UTC のサーバーで描くと日本時間から 9 時間ずれていた

describe("formatDate（日本時間）", () => {
  it("UTC 15:00 は日本時間の翌日 0:00 なので、翌日の日付になる", () => {
    expect(formatDate("2026-10-15T15:00:00Z")).toBe("2026/10/16");
  });

  it("UTC 14:59 は日本時間でまだ当日（23:59）", () => {
    expect(formatDate("2026-10-15T14:59:59Z")).toBe("2026/10/15");
  });

  it("null は —", () => {
    expect(formatDate(null)).toBe("—");
  });
});

describe("formatDateTime（日本時間）", () => {
  it("UTC 23:00 → 日本時間の翌日 8:00", () => {
    expect(formatDateTime("2026-10-15T23:00:00Z")).toBe("2026/10/16 8:00:00");
  });

  it("null は —", () => {
    expect(formatDateTime(null)).toBe("—");
  });
});

describe("formatYen", () => {
  it("3 桁区切りに ¥ を付ける", () => {
    expect(formatYen(12000)).toBe("¥12,000");
    expect(formatYen(0)).toBe("¥0");
  });
});
