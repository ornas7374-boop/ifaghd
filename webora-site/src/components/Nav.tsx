"use client";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";

const links = [
  { href: "#problem", label: "المشكلة" },
  { href: "#solution", label: "الحل" },
  { href: "#process", label: "كيف يشتغل" },
  { href: "#pricing", label: "الباقات" },
  { href: "#faq", label: "أسئلة" },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-[color:var(--ink)]/85 backdrop-blur-xl border-b border-white/5"
          : "bg-transparent"
      }`}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-10">
        <a href="#top" className="flex items-center gap-3">
          <Logo size={26} />
        </a>

        <ul className="hidden items-center gap-8 lg:flex" dir="rtl">
          {links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="text-sm text-white/70 transition hover:text-[color:var(--mint)]"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3">
          <a
            href="#cta"
            className="hidden items-center gap-2 rounded-full bg-[color:var(--mint)] px-5 py-2.5 text-sm font-semibold text-[color:var(--ink)] transition hover:brightness-110 lg:inline-flex"
          >
            ابدأ مشروعك
            <span aria-hidden>←</span>
          </a>
          <button
            aria-label="Menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="rounded-full border border-white/10 p-2.5 text-white/80 transition hover:text-[color:var(--mint)] lg:hidden"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {open ? (
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              ) : (
                <>
                  <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
                </>
              )}
            </svg>
          </button>
        </div>
      </nav>

      {/* mobile menu */}
      <div
        className={`overflow-hidden border-t border-white/5 bg-[color:var(--ink)]/95 backdrop-blur-xl transition-[max-height] duration-500 lg:hidden ${
          open ? "max-h-96" : "max-h-0"
        }`}
      >
        <ul className="flex flex-col gap-1 px-6 py-4" dir="rtl">
          {links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                onClick={() => setOpen(false)}
                className="block rounded-xl px-4 py-3 text-base text-white/80 transition hover:bg-white/5 hover:text-[color:var(--mint)]"
              >
                {l.label}
              </a>
            </li>
          ))}
          <li className="mt-2">
            <a
              href="#cta"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center rounded-full bg-[color:var(--mint)] px-6 py-3 text-base font-semibold text-[color:var(--ink)]"
            >
              ابدأ مشروعك ←
            </a>
          </li>
        </ul>
      </div>
    </header>
  );
}
