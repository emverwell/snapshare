import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Traces only the files each route actually needs into .next/standalone,
  // so the Docker runtime stage doesn't need node_modules at all.
  output: "standalone",
};

export default nextConfig;
