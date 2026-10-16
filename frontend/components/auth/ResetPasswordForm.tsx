"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import Field from "@/components/ui/Field";
import { applyLaravelErrors } from "@/lib/form-errors";
import { resetPasswordSchema, type ResetPasswordFormValues } from "@/lib/schemas/resetPassword";

type Props = {
  /** メールのリンクの ?token= / ?email=。page.tsx（SC）が読んで渡す（docs/08 §3.6） */
  token: string;
  email: string;
};

export default function ResetPasswordForm({ token, email }: Props) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({ resolver: zodResolver(resetPasswordSchema) });

  async function onSubmit(values: ResetPasswordFormValues) {
    setServerError(null);

    const res = await fetch("/bff/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, email, ...values }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      // 無効・期限切れのトークンは errors.email で返る（フォームに email 欄は無い）→ フォーム下に出す
      const message = body?.errors?.email?.[0];
      setServerError(
        message ?? applyLaravelErrors(body, setError, "パスワードを再設定できませんでした。"),
      );
      return;
    }

    router.push("/login?reset=1");
  }

  return (
    <div className="mx-auto max-w-sm px-6 py-24">
      <h1 className="text-center text-2xl tracking-[0.15em] uppercase">Reset Password</h1>
      <p className="mt-4 text-center text-xs tracking-widest text-graphite uppercase">{email}</p>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-12 space-y-6">
        <Field
          label="New Password"
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
          {isSubmitting ? "..." : "Set New Password"}
        </button>
      </form>
    </div>
  );
}
