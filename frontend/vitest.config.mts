import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    // R4: サーバー（コンテナ）と同じ UTC で動かす。日本時間の表示が「どのタイムゾーンで動いても」正しいことを確かめるため
    env: { TZ: "UTC" },
  },
});
