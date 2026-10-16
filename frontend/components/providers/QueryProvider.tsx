"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

/**
 * TanStack Query のプロバイダ。「クライアント主体の読み書き」で使う（docs/08 §3.4）:
 * カートの在庫再検証、ログイン状態の AccountLink、決済ステータスのポーリングの 3 つだけ（docs/08 §3.4）。
 *
 * QueryClient は再レンダーを跨いで同じインスタンスを保ちたいので useState 初期値で1回だけ作る。
 * children に Server Component を渡してもクライアント化はされない（React の children 合成）。
 */
export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient());

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
