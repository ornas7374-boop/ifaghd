import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // صفحات خاصة بالمستخدم أو أدوات داخلية: لا فائدة من فهرستها
      disallow: [
        "/admin",
        "/owner",
        "/bookings",
        "/login",
        "/auth/",
        "/styleguide",
        "/places/*/book",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
