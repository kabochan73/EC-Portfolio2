import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup();
});

// next/link・next/image は Next.js の実行環境が前提なので、テストでは素の <a>・<img> に置き換える
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: ReactNode; href: unknown }) =>
    createElement("a", { href: typeof href === "string" ? href : "#", ...props }, children),
}));

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => createElement("img", { src, alt }),
}));
