"use client";

import { usePathname, useRouter } from "next/navigation";
import { Suspense } from "react";
import { ToastProvider } from "@/components/ui/toast";
import { useHotkeys } from "@/lib/hooks/use-hotkeys";
import { ALL_PAGES } from "@/lib/nav";
import { AppStateProvider, useApp } from "./app-state";
import { CommandPalette } from "./command-palette";
import { CreateModal } from "./create-modal";
import { MobileNav } from "./mobile-nav";
import { RecordPanels } from "./record-panels";
import { ShortcutsModal } from "./shortcuts-modal";
import { Sidebar } from "./sidebar";
import { RANGES, Topbar } from "./topbar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AppStateProvider>
      <ToastProvider>
        <div className="flex min-h-dvh">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <Suspense fallback={<div className="h-12 border-b border-border" />}>
              <Topbar />
            </Suspense>
            <main id="main" className="min-w-0 flex-1 pb-20 md:pb-0">
              {children}
            </main>
          </div>
        </div>
        <MobileNav />
        <Suspense>
          <GlobalLayer />
        </Suspense>
      </ToastProvider>
    </AppStateProvider>
  );
}

/** Everything global that reads the URL: hotkeys, palette, dialogs, record panels. */
function GlobalLayer() {
  const router = useRouter();
  const pathname = usePathname();
  const { paletteOpen, setPaletteOpen, setCreateOpen, setShortcutsOpen, collapsed, setCollapsed, createOpen, shortcutsOpen } = useApp();
  const modalOpen = paletteOpen || createOpen || shortcutsOpen;

  const setParam = (key: string, value: string | null) => {
    const sp = new URLSearchParams(window.location.search);
    if (value === null) sp.delete(key);
    else sp.set(key, value);
    const qs = sp.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  };

  const goMap = Object.fromEntries(ALL_PAGES.filter((p) => p.go).map((p) => [`g ${p.go}`, () => router.push(p.href)]));

  useHotkeys({
    "mod+k": () => setPaletteOpen(!paletteOpen),
    ...(modalOpen
      ? {}
      : {
          "/": () => setPaletteOpen(true),
          c: () => setCreateOpen(true),
          "?": () => setShortcutsOpen(true),
          "[": () => setCollapsed(!collapsed),
          escape: () => {
            const sp = new URLSearchParams(window.location.search);
            if (sp.has("order") || sp.has("workflow")) {
              const next = new URLSearchParams(sp);
              next.delete("order");
              next.delete("workflow");
              const qs = next.toString();
              router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
            }
          },
          ...Object.fromEntries(RANGES.map((r, i) => [String(i + 1), () => setParam("range", r === "30d" ? null : r)])),
          ...goMap,
        }),
  });

  return (
    <>
      <CommandPalette />
      <CreateModal />
      <ShortcutsModal />
      <RecordPanels />
    </>
  );
}
