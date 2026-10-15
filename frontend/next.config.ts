import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 本番は Docker（standalone 出力）で node server.js を起動する（docs/04）。
  // dev（next dev）には影響しない。
  output: "standalone",
};

export default nextConfig;
