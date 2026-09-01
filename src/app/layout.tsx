import type { Metadata } from "next";
import { Tajawal } from "next/font/google";
import "./globals.css";
import { courseConfig } from "@/config/course";

const tajawal = Tajawal({
  subsets: ["arabic"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-tajawal",
});

export const metadata: Metadata = {
  title: `${courseConfig.courseName} — مجانًا`,
  description: courseConfig.courseDescription,
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
