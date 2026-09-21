import type { Metadata, Viewport } from "next";
import { Space_Grotesk, IBM_Plex_Sans_Arabic, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const ibmPlexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "700"],
  variable: "--font-ibm-arabic",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["500"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Webora — مواقع لها حضور · Websites with an aura",
  description:
    "استوديو تصميم مواقع بالذكاء الاصطناعي. مواقع premium ثنائية اللغة لأصحاب الأعمال في السعودية والخليج — في 7 أيام، بأسعار ثابتة، بضمان استرداد المبلغ.",
  keywords: [
    "تصميم مواقع",
    "استوديو مواقع",
    "premium website",
    "Webora",
    "MENA web design",
    "Arabic web design",
    "بيلينجوال",
  ],
  openGraph: {
    title: "Webora — مواقع لها حضور",
    description: "أطلق موقعك في 7 أيام. أسعار ثابتة. صفر مفاجآت.",
    type: "website",
    locale: "ar_SA",
  },
};

export const viewport: Viewport = {
  themeColor: "#0A0E27",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${spaceGrotesk.variable} ${ibmPlexArabic.variable} ${inter.variable} ${jetbrains.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
