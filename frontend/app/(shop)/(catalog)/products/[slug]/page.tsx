import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import Accordion from "@/components/product/Accordion";
import Gallery from "@/components/product/Gallery";
import ProductCard from "@/components/product/ProductCard";
import SizeChartTable from "@/components/product/SizeChartTable";
import VariantSelector from "@/components/product/VariantSelector";
import { formatYen } from "@/lib/format";
import { getProduct } from "@/lib/products";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  // メタデータ解決はレスポンス開始前なので、ここで notFound() すると 404 ステータスが
  // 正しく返る（page 側で呼ぶと loading.tsx のストリーミングで既に 200 が送られている）。
  if (!product) {
    notFound();
  }
  return { title: product.name };
}

/**
 * 商品詳細（docs/01-sitemap-pages.md）。読み取りのみなので Server Component。
 * 未公開・存在しない slug は notFound()（(shop)/not-found.tsx）。
 */
export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <nav className="mb-8 text-[11px] tracking-widest text-graphite uppercase">
        <Link href="/" className="hover:text-ink">
          Home
        </Link>
        <span className="mx-2">/</span>
        <span>{product.name}</span>
      </nav>

      <div className="grid gap-12 md:grid-cols-2">
        <Gallery images={product.images} name={product.name} />

        {/* 右パネル（PC はスティッキー） */}
        <div className="md:sticky md:top-20 md:self-start">
          <p className="text-[11px] tracking-widest text-graphite uppercase">
            {product.category.name}
          </p>
          <h1 className="mt-2 text-2xl tracking-wide">{product.name}</h1>
          <p className="mt-2 text-lg">{formatYen(product.price)}</p>

          <div className="mt-6 border border-ink px-4 py-3 text-xs tracking-widest uppercase">
            Shipping: 3–5 Business Days
          </div>

          <div className="mt-8">
            <VariantSelector
              productSlug={product.slug}
              productName={product.name}
              price={product.price}
              imageUrl={product.images[0]?.url ?? null}
              colors={product.colors}
              variants={product.variants}
            />
          </div>

          <div className="mt-10 divide-y divide-ink border-t border-b border-ink">
            <Accordion title="Description">
              <p>{product.description}</p>
            </Accordion>

            <Accordion title="Material & Care">
              <p>{product.material}</p>
              {product.care && <p className="mt-2">{product.care}</p>}
            </Accordion>

            {product.size_chart && (
              <Accordion title="Size Guide">
                <SizeChartTable chart={product.size_chart} />
              </Accordion>
            )}

            <Accordion title="Shipping & Returns">
              <p>
                Standard shipping takes 3–5 business days. Returns are accepted within 14 days of
                delivery, unworn and in original packaging.
              </p>
            </Accordion>
          </div>

          <div className="mt-6 flex flex-wrap gap-6 text-[11px] tracking-widest text-graphite uppercase">
            <p>Origin: {product.origin}</p>
            <p>Product Code: {product.product_code}</p>
          </div>
        </div>
      </div>

      {product.related.length > 0 && (
        <section className="mt-24 border-t border-ink pt-16">
          <h2 className="mb-10 text-2xl font-medium tracking-[0.15em] uppercase">
            You May Also Like
          </h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-x-6">
            {product.related.map((related) => (
              <ProductCard key={related.id} product={related} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
