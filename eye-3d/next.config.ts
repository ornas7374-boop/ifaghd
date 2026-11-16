import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // three.js ships ESM only; Next transpiles it for the server graph.
  transpilePackages: ["three"],
  // This app has its own lockfile inside a larger repo.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
