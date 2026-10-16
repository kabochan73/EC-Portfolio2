import Link from "next/link";

type Props = {
  currentPage: number;
  lastPage: number;
  /** ページ番号 → URL。今の検索条件を残したまま page だけ変えるのは呼ぶ側の役目 */
  hrefFor: (page: number) => string;
};

/**
 * 管理画面の一覧の「Prev 1 / 3 Next」（Server Component。商品・注文・会員で共用。R4 で部品化）。
 * 1 ページしかなければ何も出さない
 */
export default function Pagination({ currentPage, lastPage, hrefFor }: Props) {
  if (lastPage <= 1) return null;

  return (
    <nav className="mt-6 flex items-center gap-4 text-xs tracking-widest uppercase" aria-label="ページ送り">
      {currentPage > 1 ? (
        <Link href={hrefFor(currentPage - 1)} className="hover:underline">
          Prev
        </Link>
      ) : (
        <span className="text-graphite">Prev</span>
      )}
      <span>
        {currentPage} / {lastPage}
      </span>
      {currentPage < lastPage ? (
        <Link href={hrefFor(currentPage + 1)} className="hover:underline">
          Next
        </Link>
      ) : (
        <span className="text-graphite">Next</span>
      )}
    </nav>
  );
}
