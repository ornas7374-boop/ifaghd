"use client";

import { usePathname } from "next/navigation";
import { BottomNav } from "./BottomNav";

// الإطار العام: محتوى بعرض جوال + شريط سفلي فيه زر الطوارئ في كل الصفحات (إلا صفحة الطوارئ نفسها).
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isStuck = pathname.startsWith("/stuck");

  return (
    <>
      <main className={`mx-auto w-full max-w-lg px-4 pt-[max(1rem,env(safe-area-inset-top))] ${isStuck ? "" : "pb-32"}`}>
        {children}
      </main>
      {!isStuck && <BottomNav />}
    </>
  );
}
