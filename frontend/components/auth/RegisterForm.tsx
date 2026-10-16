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
import { registerSchema, type RegisterFormValues } from "@/lib/schemas/register";
import type { ApiResource, User } from "@/lib/types";

type Props = {
  /** ?redirect=。page.tsx（SC）が searchParams から読んで渡す（docs/08 §3.6） */
  redirectTo: string | null;
};

export default function RegisterForm({ redirectTo }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({ resolver: zodResolver(registerSchema) });

  async function onSubmit(values: RegisterFormValues) {
    setServerError(null);

    const res = await fetch("/bff/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setServerError(applyLaravelErrors(body, setError, "会員登録に失敗しました。"));
      return;
    }

    const body = (await res.json()) as ApiResource<User>;
    queryClient.setQueryData(["session"], body);

    // 戻り先はログインと同じくサイト内のパスだけに限る（R4 修正）。R3 は ?redirect= をそのまま
    // router.push していたので、/register?redirect=//evil.example で登録直後に外部サイトへ飛ばせた
    router.push(resolveLoginRedirect(redirectTo, body.data.role));
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-sm px-6 py-24">
      <h1 className="text-center text-2xl tracking-[0.15em] uppercase">Register</h1>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-12 space-y-6">
        <Field
          label="Name"
          id="name"
          type="text"
          autoComplete="name"
          error={errors.name?.message}
          {...register("name")}
        />
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
          autoComplete="new-password"
          error={errors.password?.message}
          {...register("password")}
        />
        <Field
          label="Confirm Password"
          id="password_confirmation"
          type="password"
          autoComplete="new-password"
          error={errors.password_confirmation?.message}
          {...register("password_confirmation")}
        />

        {serverError && <p className="text-xs text-graphite">{serverError}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-ink py-3 text-xs tracking-widest text-paper uppercase transition-opacity hover:opacity-80 disabled:opacity-50"
        >
          {isSubmitting ? "..." : "Register"}
        </button>
      </form>

      <p className="mt-8 text-center text-xs text-graphite">
        Already have an account?{" "}
        <Link href="/login" className="text-ink underline underline-offset-2">
          Login
        </Link>
      </p>
    </div>
  );
}
