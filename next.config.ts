import type { NextConfig } from "next";

// Static export for GitHub Pages, which serves this repo at
// https://<owner>.github.io/ifaghd/ rather than from the domain root.
// GITHUB_PAGES is set only by .github/workflows/pages.yml, so a plain
// `next dev` / `next build` elsewhere is unaffected.
const isGithubPages = process.env.GITHUB_PAGES === "true";
const basePath = isGithubPages ? "/ifaghd" : "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  assetPrefix: basePath,
  images: { unoptimized: true },
  // Mirrors basePath into the client bundle so hardcoded asset paths (see
  // lib/basePath.ts) can prefix themselves the same way Next does internally.
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;
