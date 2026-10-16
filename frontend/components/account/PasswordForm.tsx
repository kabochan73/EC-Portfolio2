"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import Field from "@/components/ui/Field";
import { applyLaravelErrors } from "@/lib/form-errors";
import { passwordSchema, type PasswordFormValues } from "@/lib/schemas/password";

export default function PasswordForm() {
  const [notice, setNotice] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PasswordFormValues>({ resolver: zodResolver(passwordSchema) });

  async function onSubmit(values: PasswordFormValues) {
    setNotice(null);

    const res = await fetch("/bff/me/password", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setNotice(applyLaravelErrors(body, setError, "変更できませんでした。"));
      return;
    }

    reset();
    setNotice("パスワードを変更しました。ほかの端末ではログアウトされました。");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      <Field
        label="現在のパスワード"
        id="current_password"
        type="password"
        autoComplete="current-password"
        error={errors.current_password?.message}
        {...register("current_password")}
      />
      <Field
        label="新しいパスワード"
        id="password"
        type="password"
        autoComplete="new-password"
        error={errors.password?.message}
        {...register("password")}
      />
      <Field
        label="新しいパスワード（確認）"
        id="password_confirmation"
        type="password"
        autoComplete="new-password"
        error={errors.password_confirmation?.message}
        {...register("password_confirmation")}
      />

      {notice && <p className="text-xs text-graphite">{notice}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-ink px-6 py-2 text-xs tracking-widest text-paper uppercase hover:opacity-80 disabled:opacity-50"
      >
        {isSubmitting ? "..." : "Change Password"}
      </button>
    </form>
  );
}
