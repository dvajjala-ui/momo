import { resolve } from "node:path";
import type { NextConfig } from "next";

// The app normally runs on Cloudflare Workers (Vinext). For `next build` on
// Vercel, `cloudflare:workers` resolves to a Node stand-in with SQLite/libSQL.
const vercelEnv = resolve(process.cwd(), "lib", "vercel-cloudflare-env.ts");
const forNext = process.env.VERCEL === "1" || process.env.MOMO_TARGET === "next";
const isDev = process.env.NODE_ENV !== "production";
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://upload.wikimedia.org",
  "connect-src 'self' https: wss:",
  "frame-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");
const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];
const shared:NextConfig={async headers(){return [{source:"/:path*",headers:securityHeaders}]}};

const nextConfig: NextConfig = forNext
  ? {
      ...shared,
      serverExternalPackages: ["node:sqlite"],
      turbopack: {
        resolveAlias: { "cloudflare:workers": "./lib/vercel-cloudflare-env.ts" },
      },
      webpack(config, { webpack }) {
        config.resolve ??= {};
        config.resolve.alias = { ...config.resolve.alias, "cloudflare:workers": vercelEnv };
        // Webpack treats the colon as a URL scheme before it considers aliases.
        config.plugins.push(new webpack.NormalModuleReplacementPlugin(/^cloudflare:workers$/, vercelEnv));
        return config;
      },
    }
  : shared;

export default nextConfig;
