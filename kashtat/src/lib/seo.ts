import type { Metadata } from "next";
import { DEFAULT_OG_IMAGE, SITE_NAME } from "./site";

type PageMetaInput = {
  title: string;
  description: string;
  /** المسار الأساسي للصفحة (canonical) */
  path: string;
  image?: { url: string; alt?: string };
};

/**
 * بيانات الصفحة لمحركات البحث والمشاركة.
 * Next يستبدل openGraph كاملًا عند تعريفه في الصفحة، لذلك نعيد القيم الأساسية هنا.
 */
export function pageMeta({ title, description, path, image }: PageMetaInput): Metadata {
  const img = image ?? { url: DEFAULT_OG_IMAGE };
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      locale: "ar_SA",
      siteName: SITE_NAME,
      title,
      description,
      url: path,
      images: [{ url: img.url, alt: img.alt ?? title }],
    },
    twitter: { card: "summary_large_image", title, description, images: [img.url] },
  };
}

/** يقص النص على حدود كلمة بطول مناسب لوصف الصفحة */
export function clip(text: string, max = 155): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(" ") > 80 ? cut.lastIndexOf(" ") : max)}…`;
}
