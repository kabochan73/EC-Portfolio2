import type { SizeChart } from "@/lib/types";

/**
 * size_chart（jsonb）を表でレンダリング（docs/01-sitemap-pages.md）。
 * null のカテゴリ（アクセサリー等）では呼び出し側が出さない。
 */
export default function SizeChartTable({ chart }: { chart: SizeChart }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead>
          <tr>
            <th className="py-1 pr-4 text-graphite uppercase">Size</th>
            {chart.columns.map((column) => (
              <th key={column} className="py-1 pr-4 text-graphite uppercase">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Object.entries(chart.rows).map(([size, values]) => (
            <tr key={size} className="border-t border-mist">
              <td className="py-1 pr-4">{size}</td>
              {values.map((value, index) => (
                <td key={index} className="py-1 pr-4">
                  {value}
                  {chart.unit}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
