"use client";

import { IconMoon, IconSun } from "./ui/icons";

// تفضيل عرض فقط، يُقرأ قبل الرسم في layout — لذلك مخزّن مباشرة خارج طبقة البيانات.
export function ThemeToggle() {
  const toggle = () => {
    const light = document.documentElement.classList.toggle("light");
    try {
      localStorage.setItem("azm:theme", light ? "light" : "dark");
    } catch {}
  };
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="تبديل الوضع الفاتح والداكن"
      className="grid size-11 place-items-center rounded-full border border-line bg-surface text-muted hover:text-fg"
    >
      <span className="[html.light_&]:hidden"><IconSun /></span>
      <span className="hidden [html.light_&]:inline"><IconMoon /></span>
    </button>
  );
}
