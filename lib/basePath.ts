/**
 * Prefixes a root-relative asset path with the app's basePath.
 *
 * Next.js only rewrites basePath automatically for next/image, next/link, and
 * bundled CSS/JS assets — a hardcoded `src="/foo.jpg"` or a manually built
 * fetch URL is left as-is. On GitHub Pages, where this site is served from
 * /ifaghd/ rather than the domain root, every one of those was requesting
 * https://…/foo.jpg instead of https://…/ifaghd/foo.jpg and silently 404ing.
 * Every hardcoded asset path in the app must go through this.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function withBasePath(path: string): string {
  return `${BASE_PATH}${path}`;
}
