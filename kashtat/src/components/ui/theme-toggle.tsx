"use client";

import { useSyncExternalStore } from "react";
import { THEME_STORAGE_KEY, type Theme } from "@/lib/theme";
import { MoonIcon, SunIcon } from "./icons";

function readTheme(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

function subscribe(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, readTheme, () => "dark" as Theme);
  const next: Theme = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={() => {
        document.documentElement.dataset.theme = next;
        try {
          localStorage.setItem(THEME_STORAGE_KEY, next);
        } catch {
          // التخزين غير متاح: يبقى الاختيار لهذه الجلسة فقط
        }
      }}
      aria-label={theme === "dark" ? "التبديل إلى الثيم الفاتح" : "التبديل إلى الثيم الداكن"}
      className="inline-flex size-11 items-center justify-center rounded-md border border-border-strong bg-surface-raised text-ink transition-colors hover:bg-surface-overlay"
    >
      {theme === "dark" ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
