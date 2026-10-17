import Link from "next/link";

type Props = {
  label: string;
  value: string | number;
  /** あればカード全体がリンクになる（ダッシュボードの「未発送」→ 注文一覧の絞り込みなど） */
  href?: string;
};

export default function StatCard({ label, value, href }: Props) {
  const body = (
    <>
      <p className="text-[11px] tracking-widest text-graphite uppercase">{label}</p>
      <p className="mt-2 text-2xl">{value}</p>
    </>
  );

  return href ? (
    <Link href={href} className="block border border-ink p-4 transition-colors hover:bg-mist">
      {body}
    </Link>
  ) : (
    <div className="border border-ink p-4">{body}</div>
  );
}
