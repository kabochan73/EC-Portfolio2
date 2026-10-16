/**
 * ブランドコンセプト（docs/01-sitemap-pages.md: 3〜4行、余白広め、中央寄せ）。
 * 理念・スタンスのみを短く。CMS の concept.body 駆動。空なら何も出さない。
 */
export default function BrandConcept({ body }: { body: string }) {
  const lines = body.split("\n").map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  return (
    <section className="mx-auto max-w-xl px-6 py-24 text-center">
      {lines.map((line, i) => (
        <p key={i} className="text-sm leading-loose tracking-wide text-graphite">
          {line}
        </p>
      ))}
    </section>
  );
}
