import { resolve } from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack(config) {
    config.resolve ??= {};
    config.resolve.alias = {
      ...config.resolve.alias,
      "cloudflare:workers": resolve(process.cwd(), "lib", "vercel-cloudflare-env.ts"),
    };
    return config;
  },
};

export default nextConfig;
