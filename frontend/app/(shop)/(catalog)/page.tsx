import AboutSection from "@/components/home/AboutSection";
import BrandConcept from "@/components/home/BrandConcept";
import CategoryGrid from "@/components/home/CategoryGrid";
import Hero from "@/components/home/Hero";
import Lookbook from "@/components/home/Lookbook";
import { getCategories } from "@/lib/categories";
import { getContent } from "@/lib/content";
import { getProducts } from "@/lib/products";

/**
 * トップページ（Server Component・ISR）。セクション順は docs/01-sitemap-pages.md 通り:
 *   Hero → BrandConcept → Lookbook → CategoryGrid → AboutSection
 * Hero / Concept / Lookbook / About は CMS（getContent）駆動、CategoryGrid は商品データ駆動。
 */
export default async function HomePage() {
  const [content, categories, products] = await Promise.all([
    getContent(),
    getCategories(),
    getProducts(),
  ]);

  return (
    <div>
      <Hero hero={content.hero} />
      <BrandConcept body={content.concept.body} />
      <Lookbook images={content.lookbook.images} />
      <CategoryGrid categories={categories} products={products} />
      <AboutSection blocks={content.about.blocks} />
    </div>
  );
}
