import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans_Arabic } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast";
import { themeInitScript } from "@/lib/theme";
import "./globals.css";

const plexArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-plex-arabic",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "الكشتات — احجز كشتتك",
    template: "%s | الكشتات",
  },
  description:
    "اكتشف أماكن الكشتات والمخيمات والشاليهات حولك، واحجز بالساعة أو بالليلة وادفع إلكترونيًا بتأكيد فوري.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0b0e0c" },
    { media: "(prefers-color-scheme: light)", color: "#f5f1e8" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ar"
      dir="rtl"
      data-theme="dark"
      suppressHydrationWarning
      className={`${plexArabic.variable} ${plexMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
