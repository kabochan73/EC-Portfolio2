import type { Metadata } from "next";

import AboutSection from "@/components/admin/content/AboutSection";
import ConceptSection from "@/components/admin/content/ConceptSection";
import HeroSection from "@/components/admin/content/HeroSection";
import LookbookSection from "@/components/admin/content/LookbookSection";
import { fetchAdminContent } from "@/lib/admin/content";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Admin Content" };

const headingClass = "mb-6 text-[11px] tracking-widest text-graphite uppercase";

/**
 * トップページの CMS（Server Component。docs/11-cms.md）。4 つのセクションはそれぞれ別に保存する。
 * R4: セクションを並べるのは SC の page（R3 は ContentEditor というラッパーを挟んでいた）
 */
export default async function AdminContentPage() {
  const { token } = await requireAdmin("/admin/content");
  const content = await fetchAdminContent(token);

  return (
    <div className="max-w-2xl">
      <h1 className="mb-2 text-xl tracking-widest uppercase">Content</h1>
      <p className="mb-12 text-[11px] tracking-widest text-graphite uppercase">
        トップページの表示内容。保存するとすぐに反映されます。
      </p>

      <section>
        <h2 className={headingClass}>Hero</h2>
        <HeroSection initial={content.hero} />
      </section>
      <section className="mt-16 border-t border-ink pt-12">
        <h2 className={headingClass}>Concept</h2>
        <ConceptSection initial={content.concept} />
      </section>
      <section className="mt-16 border-t border-ink pt-12">
        <h2 className={headingClass}>Lookbook</h2>
        <LookbookSection initial={content.lookbook} />
      </section>
      <section className="mt-16 border-t border-ink pt-12">
        <h2 className={headingClass}>About</h2>
        <AboutSection initial={content.about} />
      </section>
    </div>
  );
}
