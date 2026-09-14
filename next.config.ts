import type { NextConfig } from "next";

// No nonce: that requires a proxy.js generating one per request and forces
// every page into dynamic rendering, losing static optimization. 'unsafe-inline'
// on script-src is a real gap (Next's App Router injects its own inline
// hydration scripts with no nonce), but the rest still blocks external
// script/image/connect exfiltration, framing, and object/embeds.
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline';
  style-src 'self';
  img-src 'self' blob: data:;
  font-src 'self';
  connect-src 'self';
  object-src 'none';
  base-uri 'none';
  form-action 'self';
  frame-ancestors 'none';
`
  .replace(/\s{2,}/g, " ")
  .trim();

const nextConfig: NextConfig = {
  // Traces only the files each route actually needs into .next/standalone,
  // so the Docker runtime stage doesn't need node_modules at all. Only for
  // the self-hosted Docker build: Vercel's own builder does its own
  // equivalent tracing/packaging and fails (ENOENT on
  // next-server.js.nft.json) if this is also set, since standalone mode
  // routes the trace output somewhere Vercel's build step doesn't expect.
  // VERCEL is set automatically in Vercel's build environment.
  ...(process.env.VERCEL ? {} : { output: "standalone" as const }),

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: cspHeader },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
