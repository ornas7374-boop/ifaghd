"use client";

import { useState } from "react";
import { Header } from "./Header";
import { MobileSidebarHeader, Sidebar } from "./Sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-e border-hairline bg-surface lg:block">
        <div className="flex h-16 items-center gap-2 border-b border-hairline px-5">
          <span className="text-lg">🐄</span>
          <span className="font-bold text-ink">الإنتاج الحيواني</span>
        </div>
        <Sidebar />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <div className="absolute inset-y-0 start-0 w-72 bg-surface shadow-xl">
            <MobileSidebarHeader onClose={() => setMobileOpen(false)} />
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-h-screen flex-1 flex-col">
        <Header onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
