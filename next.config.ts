import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Traces only the files each route actually needs into .next/standalone,
  // so the Docker runtime stage doesn't need node_modules at all. Only for
  // the self-hosted Docker build: Vercel's own builder does its own
  // equivalent tracing/packaging and fails (ENOENT on
  // next-server.js.nft.json) if this is also set, since standalone mode
  // routes the trace output somewhere Vercel's build step doesn't expect.
  // VERCEL is set automatically in Vercel's build environment.
  ...(process.env.VERCEL ? {} : { output: "standalone" as const }),
};

export default nextConfig;
