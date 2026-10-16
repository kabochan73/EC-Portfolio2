import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";

/**
 * ストアフロント共通レイアウト。全ページに Header / Footer を付ける。
 * 管理画面（app/admin/）は別レイアウトなのでこのグループには入れない。
 */
export default function ShopLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Header />
      {/* Header が fixed（h-16）なので本文側で高さを確保する。 */}
      <main className="min-h-screen pt-16">{children}</main>
      <Footer />
    </>
  );
}
