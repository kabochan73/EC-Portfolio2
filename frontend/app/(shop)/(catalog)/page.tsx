import CategoryGrid from "@/components/home/CategoryGrid";
import { getCategories } from "@/lib/categories";
import { getProducts } from "@/lib/products";

/**
 * トップページ（Server Component・ISR）。セクション順は docs/01-sitemap-pages.md 通り:
 *   Hero → BrandConcept → Lookbook → CategoryGrid → AboutSection
 * Step 32 は CategoryGrid（商品データ駆動）だけ。CMS 駆動の 4 セクションは Step 33 で足す。
 */
export default async function HomePage() {
  const [categories, products] = await Promise.all([getCategories(), getProducts()]);

  return (
    <div>
      <CategoryGrid categories={categories} products={products} />
    </div>
  );
}
