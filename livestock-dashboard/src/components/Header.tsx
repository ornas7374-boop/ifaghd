"use client";

import { Menu, Moon, Sun, Wifi } from "lucide-react";
import { useTheme } from "./theme-provider";

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const { theme, toggle } = useTheme();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-hairline bg-surface/90 px-4 backdrop-blur sm:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-ink-secondary hover:bg-surface-2 lg:hidden"
          aria-label="فتح القائمة"
        >
          <Menu size={20} />
        </button>
        <div className="leading-tight">
          <h1 className="text-sm font-bold text-ink sm:text-base">
            قسم الإنتاج الحيواني
          </h1>
          <p className="hidden text-xs text-ink-muted sm:block">محطة الأبحاث والتجارب</p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <span className="hidden items-center gap-1.5 rounded-full border border-hairline bg-surface-2 px-3 py-1 text-xs font-medium text-good sm:flex">
          <Wifi size={13} />
          النظام متصل
        </span>
        <button
          onClick={toggle}
          className="rounded-lg border border-hairline p-2 text-ink-secondary transition-colors hover:bg-surface-2"
          aria-label={theme === "dark" ? "تفعيل الوضع النهاري" : "تفعيل الوضع الليلي"}
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  );
}
