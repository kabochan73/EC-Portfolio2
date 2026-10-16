import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import EditProductForm from "@/components/admin/EditProductForm";
import ProductImagesManager from "@/components/admin/ProductImagesManager";
import { fetchAdminCategories } from "@/lib/admin/categories";
import { fetchAdminProduct } from "@/lib/admin/products";
import { ApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import type { AdminCategory, AdminProduct } from "@/lib/types";

type PageProps = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "Edit Product" };

/**
 * 商品の編集（Server Component）。基本情報・画像・（Step 46b で）バリアントの 3 つの部品を並べる。
 * R4: 部品を並べるのは SC の page（R3 は EditProductClient という CC がまとめていた）。
 * 各部品は操作の後に router.refresh() するので、このページが取り直して props が新しくなる
 */
export default async function EditProductPage({ params }: PageProps) {
  const { id } = await params;
  const { token } = await requireAdmin(`/admin/products/${id}`);

  // 商品とカテゴリは互いに関係ないので同時に取る
  let product: AdminProduct;
  let categories: AdminCategory[];
  try {
    [product, categories] = await Promise.all([fetchAdminProduct(token, Number(id)), fetchAdminCategories(token)]);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  return (
    <div>
      <nav className="mb-6 text-[11px] tracking-widest text-graphite uppercase">
        <Link href="/admin/products" className="hover:text-ink">
          Products
        </Link>
        <span className="mx-2">/</span>
        <span>{product.name}</span>
      </nav>
      <h1 className="mb-8 text-xl tracking-widest uppercase">Edit Product</h1>

      <EditProductForm product={product} categories={categories} />
      <hr className="my-10 border-mist" />
      <ProductImagesManager productId={product.id} images={product.images} />
    </div>
  );
}
