"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";

import Field from "@/components/ui/Field";
import {
  forgotPasswordSchema,
  type ForgotPasswordFormValues,
} from "@/lib/schemas/forgotPassword";

export default function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({ resolver: zodResolver(forgotPasswordSchema) });

  async function onSubmit(values: ForgotPasswordFormValues) {
    await fetch("/bff/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    // 成功・失敗に関わらず中立表示（アカウント存在を漏らさない）
    setSent(true);
  }

  return (
    <div className="mx-auto max-w-sm px-6 py-24">
      <h1 className="text-center text-2xl tracking-[0.15em] uppercase">Reset Password</h1>

      {sent ? (
        <p className="mt-12 text-center text-sm text-graphite">
          ご登録があれば、パスワード再設定メールを送信しました。メールをご確認ください。
        </p>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-12 space-y-6">
          <Field
            label="Email"
            id="email"
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register("email")}
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-ink py-3 text-xs tracking-widest text-paper uppercase transition-opacity hover:opacity-80 disabled:opacity-50"
          >
            {isSubmitting ? "..." : "Send Reset Link"}
          </button>
        </form>
      )}

      <p className="mt-8 text-center text-xs text-graphite">
        <Link href="/login" className="text-ink underline underline-offset-2">
          Back to Login
        </Link>
      </p>
    </div>
  );
}
