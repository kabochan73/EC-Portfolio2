"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import type { ApiResource, User } from "@/lib/types";

/**
 * ヘッダーの Account リンク。ログイン状態を /bff/me で確認し、遷移先とラベルを出し分ける
 * （未ログイン: /login "Login"、ログイン中: /account "Account"。docs/01-sitemap-pages.md）。
 *
 * Server Component（Header）で cookies() を読むとページ全体が動的レンダリングになり
 * ISR が効かなくなるため、あえてクライアント側で判定する。マウント直後は一瞬
 * 未ログイン扱いになるが許容。ログイン/ログアウトのフォームが ["session"] を
 * setQueryData / invalidate するのでそのタイミングで貼り直される。
 */
export default function AccountLink() {
  const { data } = useQuery({
    queryKey: ["session"],
    queryFn: async (): Promise<ApiResource<User> | null> => {
      const res = await fetch("/bff/me");
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 60_000,
  });

  return (
    <Link href={data ? "/account" : "/login"} className="transition-opacity hover:opacity-60">
      {data ? "Account" : "Login"}
    </Link>
  );
}
