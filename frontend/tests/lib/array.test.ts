import { describe, expect, it } from "vitest";

import { moveItem } from "@/lib/array";

describe("moveItem（CMS の ▲▼）", () => {
  it("前へ・後ろへ 1 つ動かした新しい配列を返す（元の配列は変えない）", () => {
    const list = ["a", "b", "c"];
    expect(moveItem(list, 1, -1)).toEqual(["b", "a", "c"]);
    expect(moveItem(list, 1, 1)).toEqual(["a", "c", "b"]);
    expect(list).toEqual(["a", "b", "c"]);
  });

  it("端からはみ出す動きは何もしない", () => {
    const list = ["a", "b"];
    expect(moveItem(list, 0, -1)).toBe(list);
    expect(moveItem(list, 1, 1)).toBe(list);
  });
});
