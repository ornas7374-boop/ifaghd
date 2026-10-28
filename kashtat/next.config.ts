import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

// روابط الأماكن القديمة (demo-...) → الروابط الجديدة، تحويل دائم حتى لا تضيع أي زيارة أو رابط محفوظ
const RENAMED_PLACES: Record<string, string> = {
  "demo-habala-camp": "habala-camp-abha",
  "demo-soudah-view": "soudah-view-abha",
  "demo-halfmoon-beach": "halfmoon-beach-dammam",
  "demo-aridh-evening": "aridh-evening-riyadh",
  "demo-golden-sands": "golden-sands-riyadh",
  "demo-royal-camp": "royal-desert-camp-riyadh",
  "demo-thumamah": "thumamah-riyadh",
  "demo-shafa-camp": "shafa-camp-taif",
  "demo-palm-kashta": "palm-kashta-buraidah",
  "demo-tabuk-north": "north-camp-tabuk",
  "demo-abhur-beach": "abhur-beach-jeddah",
  "demo-red-nafud-camp": "red-nafud-camp-hail",
};

const nextConfig: NextConfig = {
  async redirects() {
    return Object.entries(RENAMED_PLACES).flatMap(([from, to]) => [
      { source: `/places/${from}`, destination: `/places/${to}`, permanent: true },
      { source: `/places/${from}/:rest*`, destination: `/places/${to}/:rest*`, permanent: true },
    ]);
  },
  images: {
    // صور الأماكن المرفوعة على Supabase Storage
    remotePatterns: supabaseHost
      ? [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }]
      : [],
  },
};

export default nextConfig;
