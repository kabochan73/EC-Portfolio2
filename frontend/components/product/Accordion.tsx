/**
 * 商品詳細のアコーディオン1項目（docs/01-sitemap-pages.md）。
 * JS 不要の <details>/<summary> で実装（Server Component のまま使える）。
 */
export default function Accordion({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <details className="py-4">
      <summary className="cursor-pointer list-none text-xs tracking-widest uppercase">
        {title}
      </summary>
      <div className="mt-3 text-sm leading-loose text-graphite">{children}</div>
    </details>
  );
}
