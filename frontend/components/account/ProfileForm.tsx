"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import Field from "@/components/ui/Field";
import { applyLaravelErrors } from "@/lib/form-errors";
import { profileSchema, type ProfileFormValues } from "@/lib/schemas/profile";
import type { ApiResource, User } from "@/lib/types";

export default function ProfileForm({ user }: { user: User }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user.name, email: user.email },
  });

  async function onSubmit(values: ProfileFormValues) {
    setNotice(null);

    const res = await fetch("/bff/me", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setNotice(applyLaravelErrors(body, setError, "更新できませんでした。"));
      return;
    }

    const body = (await res.json()) as ApiResource<User>;
    queryClient.setQueryData(["session"], body);
    setNotice("保存しました。");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      <Field label="氏名" id="name" error={errors.name?.message} {...register("name")} />
      <Field
        label="メールアドレス"
        id="email"
        type="email"
        error={errors.email?.message}
        {...register("email")}
      />

      {notice && <p className="text-xs text-graphite">{notice}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-ink px-6 py-2 text-xs tracking-widest text-paper uppercase hover:opacity-80 disabled:opacity-50"
      >
        {isSubmitting ? "..." : "Save"}
      </button>
    </form>
  );
}
