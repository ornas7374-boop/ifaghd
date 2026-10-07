// عنوان الموقع الأساسي: تستخدمه الروابط المطلقة في sitemap و canonical و Open Graph
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://kashtat.vercel.app").replace(
  /\/$/,
  "",
);

export const SITE_NAME = "الكشتات";

export const SITE_DESCRIPTION =
  "احجز كشتتك أو مخيمك في السعودية: كشتات ومخيمات ومواقع برية في الرياض وجدة وأبها وغيرها، بالساعة أو باليوم أو بالليلة مع تأكيد فوري.";

// صورة المشاركة الافتراضية (من صور الأماكن الجاهزة)
export const DEFAULT_OG_IMAGE = "/places/demo-royal-camp-1.jpg";

export function absoluteUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
