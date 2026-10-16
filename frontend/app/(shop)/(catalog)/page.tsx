/**
 * トップページ（Server Component）。Step 31 は共通レイアウトの確認用の仮の中身。
 * Step 32 で商品一覧（CategoryGrid）、Step 33 で CMS セクション（Hero / Concept / Lookbook / About）に置き換える。
 */
export default function HomePage() {
  return (
    <section className="mx-auto flex min-h-[60vh] max-w-6xl flex-col items-center justify-center px-6 text-center">
      <p className="text-xs tracking-[0.3em] text-graphite uppercase">Coming soon</p>
      <h1 className="mt-4 text-2xl font-medium tracking-[0.2em] uppercase">EC-PORTFOLIO</h1>
    </section>
  );
}
