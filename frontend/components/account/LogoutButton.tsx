"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    await fetch("/bff/logout", { method: "POST" });
    queryClient.setQueryData(["session"], null);
    router.push("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={loading}
      className="text-left text-xs tracking-widest text-graphite uppercase transition-colors hover:text-ink disabled:opacity-50"
    >
      {loading ? "..." : "Logout"}
    </button>
  );
}
