import ProductCard from "@/components/product/ProductCard";
import type { Category, ProductSummary } from "@/lib/types";

type CategoryGridProps = {
  /** getCategories() の結果（position 順） */
  categories: Category[];
  /** getProducts() の結果（全公開商品・position 順） */
  products: ProductSummary[];
};

/**
 * トップページのメイン。カテゴリごとに極太見出し＋そのカテゴリの全公開商品を
 * position 順で並べる（docs/01-sitemap-pages.md）。`/collections` を作らない方針なので
 * 先頭N点に絞らず全件を出し切る。商品0件のカテゴリはセクションごと出さない。
 *
 * データ取得は呼び出し元（page.tsx）が Promise.all で行い、ここは純粋な表示。
 */
export default function CategoryGrid({ categories, products }: CategoryGridProps) {
  return (
    <>
      {categories.map((category) => {
        const items = products.filter((product) => product.category.slug === category.slug);
        if (items.length === 0) return null;

        return (
          <section
            key={category.id}
            id={category.slug}
            className="border-t border-ink px-6 py-20"
          >
            <h2 className="mb-10 text-3xl font-medium tracking-[0.15em] uppercase md:text-5xl">
              {category.name}
            </h2>

            <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-x-6">
              {items.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}
