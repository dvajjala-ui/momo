import { resolve } from "node:path";
import type { NextConfig } from "next";

// The app normally runs on Cloudflare Workers (Vinext). For `next build` on
// Vercel, `cloudflare:workers` resolves to a Node stand-in with SQLite/libSQL.
const vercelEnv = resolve(process.cwd(), "lib", "vercel-cloudflare-env.ts");
const forNext = process.env.VERCEL === "1" || process.env.MOMO_TARGET === "next";

const nextConfig: NextConfig = forNext
  ? {
      serverExternalPackages: ["node:sqlite"],
      turbopack: {
        resolveAlias: { "cloudflare:workers": "./lib/vercel-cloudflare-env.ts" },
      },
      webpack(config) {
        config.resolve ??= {};
        config.resolve.alias = { ...config.resolve.alias, "cloudflare:workers": vercelEnv };
        return config;
      },
    }
  : {};

export default nextConfig;
