"use client";

import { useImperativeHandle, useState, type Ref } from "react";

import type { SizeChart } from "@/lib/types";

export type SizeChartEditorHandle = {
  /** 今の入力から SizeChart を組み立てる。「サイズ表なし」なら null */
  getValue: () => SizeChart | null;
};

type Props = {
  initialValue: SizeChart | null;
  /** React 19 なので ref は普通の props で受け取れる（R3 は forwardRef） */
  ref?: Ref<SizeChartEditorHandle>;
};

const SIZES = ["S", "M", "L"] as const;

/** "66, 52,,46" → [66, 52, 46]（空欄と数字でないものは捨てる） */
function toNumbers(text: string): number[] {
  return text
    .split(",")
    .map((n) => n.trim())
    .filter((n) => n !== "" && !Number.isNaN(Number(n)))
    .map(Number);
}

/**
 * size_chart（jsonb）の簡易エディタ。列名・各サイズの数値はカンマ区切りのテキストで入れる
 * （例: 列「着丈,身幅,肩幅」、S「66,52,46」。R2 からの判断）。
 * react-hook-form には載せず、親（ProductForm）が送信時に ref の getValue() を呼ぶ
 */
export default function SizeChartEditor({ initialValue, ref }: Props) {
  const [enabled, setEnabled] = useState(initialValue !== null);
  const [unit, setUnit] = useState(initialValue?.unit ?? "cm");
  const [columnsText, setColumnsText] = useState(initialValue?.columns.join(",") ?? "");
  const [rowsText, setRowsText] = useState<Record<string, string>>(() =>
    Object.fromEntries(SIZES.map((size) => [size, initialValue?.rows[size]?.join(",") ?? ""])),
  );

  useImperativeHandle(ref, () => ({
    getValue: () => {
      if (!enabled) return null;

      const columns = columnsText
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);

      // 数値が 1 つも無いサイズは行ごと省く（アクセサリーなど）
      const rows: Record<string, number[]> = {};
      for (const size of SIZES) {
        const numbers = toNumbers(rowsText[size] ?? "");
        if (numbers.length > 0) rows[size] = numbers;
      }

      return { unit, columns, rows };
    },
  }));

  const inputClass = "mt-2 w-full border-b border-ink bg-transparent py-2 text-sm outline-none";
  const labelClass = "block text-[11px] tracking-widest text-graphite uppercase";

  return (
    <div>
      <label className="flex items-center gap-2 text-[11px] tracking-widest text-graphite uppercase">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        Has Size Chart
      </label>

      {enabled && (
        <div className="mt-4 space-y-4 border border-mist p-4">
          <div>
            <label htmlFor="size_chart_unit" className={labelClass}>
              Unit
            </label>
            <input id="size_chart_unit" value={unit} onChange={(e) => setUnit(e.target.value)} className={`${inputClass} w-24`} />
          </div>
          <div>
            <label htmlFor="size_chart_columns" className={labelClass}>
              Columns（カンマ区切り。例: 着丈,身幅,肩幅,袖丈）
            </label>
            <input
              id="size_chart_columns"
              value={columnsText}
              onChange={(e) => setColumnsText(e.target.value)}
              className={inputClass}
            />
          </div>
          {SIZES.map((size) => (
            <div key={size}>
              <label htmlFor={`size_chart_${size}`} className={labelClass}>
                {size}（カンマ区切りの数値。列の順番に対応）
              </label>
              <input
                id={`size_chart_${size}`}
                value={rowsText[size]}
                onChange={(e) => setRowsText({ ...rowsText, [size]: e.target.value })}
                className={inputClass}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
