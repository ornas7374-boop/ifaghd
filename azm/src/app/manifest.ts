import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "عَزم",
    short_name: "عَزم",
    description: "تطبيقك الشخصي لكسر التسويف وبناء الصلابة الذهنية.",
    lang: "ar",
    dir: "rtl",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0c1015",
    theme_color: "#0c1015",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "أنا عالق الحين", url: "/stuck", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "سجّل تأجيل", url: "/log", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "المؤقت", url: "/timer", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
