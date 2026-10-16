"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import Field from "@/components/ui/Field";
import { applyLaravelErrors } from "@/lib/form-errors";
import { resolveLoginRedirect } from "@/lib/login-redirect";
import { loginSchema, type LoginFormValues } from "@/lib/schemas/login";
import type { ApiResource, User } from "@/lib/types";

type Props = {
  /** ?redirect=（ログイン後の戻り先）。page.tsx（SC）が searchParams から読んで渡す（docs/08 §3.6） */
  redirectTo: string | null;
  /** ?reset=1（パスワード再設定の直後）なら案内を出す */
  justReset: boolean;
};

export default function LoginForm({ redirectTo, justReset }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginFormValues) {
    setServerError(null);

    const res = await fetch("/bff/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setServerError(applyLaravelErrors(body, setError, "ログインに失敗しました。"));
      return;
    }

    // 取得済みの user で AccountLink の ["session"] キャッシュを直接更新
    const body = (await res.json()) as ApiResource<User>;
    queryClient.setQueryData(["session"], body);

    // 戻り先はサイト内のパスだけ。無ければ admin は管理画面、会員はマイページへ
    router.push(resolveLoginRedirect(redirectTo, body.data.role));
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-sm px-6 py-24">
      <h1 className="text-center text-2xl tracking-[0.15em] uppercase">Login</h1>

      {justReset && (
        <p className="mt-6 text-center text-xs tracking-widest text-graphite uppercase">
          パスワードを変更しました。新しいパスワードでログインしてください。
        </p>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-12 space-y-6">
        <Field
          label="Email"
          id="email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />
        <Field
          label="Password"
          id="password"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register("password")}
        />

        {serverError && <p className="text-xs text-graphite">{serverError}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-ink py-3 text-xs tracking-widest text-paper uppercase transition-opacity hover:opacity-80 disabled:opacity-50"
        >
          {isSubmitting ? "..." : "Login"}
        </button>
      </form>

      <div className="mt-8 space-y-2 text-center text-xs text-graphite">
        <p>
          <Link href="/forgot-password" className="text-ink underline underline-offset-2">
            Forgot your password?
          </Link>
        </p>
        <p>
          No account?{" "}
          <Link
            href={redirectTo ? `/register?redirect=${encodeURIComponent(redirectTo)}` : "/register"}
            className="text-ink underline underline-offset-2"
          >
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
