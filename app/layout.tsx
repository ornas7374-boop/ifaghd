import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";

import "./globals.css";

const editorial = Cormorant_Garamond({
  variable: "--font-editorial",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
  display: "swap",
});

const grotesk = Inter({
  variable: "--font-grotesk",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://bugatti.example"),
  title: "Bugatti — Born to move.",
  description:
    "Where engineering becomes art. A private showroom for the quad-turbocharged W16 hypercar — 1,600 PS, hand-finished, built for those who understand.",
  openGraph: {
    title: "Bugatti — Born to move.",
    description: "Where engineering becomes art.",
    images: ["/og.jpg"],
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#060606",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${editorial.variable} ${grotesk.variable}`}>
      <body className="bg-ink text-paper antialiased">{children}</body>
    </html>
  );
}
