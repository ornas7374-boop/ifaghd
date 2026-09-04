import type { Metadata, Viewport } from "next";
import { Tajawal } from "next/font/google";
import "./globals.css";

const tajawal = Tajawal({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-tajawal",
});

export const metadata: Metadata = {
  title: "العين البشرية ثلاثية الأبعاد | نموذج تشريحي تفاعلي",
  description:
    "نموذج ثلاثي الأبعاد تفاعلي لتشريح العين البشرية: دوّر، كبّر، واضغط على أي جزء لعرض وظيفته ووصفه الطبي وأهم ملاحظاته السريرية.",
};

export const viewport: Viewport = {
  themeColor: "#070b14",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${tajawal.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
