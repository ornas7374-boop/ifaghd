"use client";

import { useEffect, useState } from "react";

import { NAV_LINKS } from "@/lib/content";

export function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={[
        "fixed inset-x-0 top-0 z-50 transition-[background-color,border-color] duration-700",
        "ease-[cubic-bezier(0.22,1,0.36,1)] border-b",
        scrolled
          ? "border-paper/10 bg-[rgba(6,6,6,0.82)]"
          // At rest the bar is transparent, but the hero behind it is footage,
          // not a black studio — a soft top-down scrim keeps the wordmark and
          // links legible against a bright sky without reading as a bar.
          : "border-transparent bg-linear-to-b from-[rgba(6,6,6,0.7)] to-transparent",
      ].join(" ")}
    >
      <nav
        aria-label="Primary"
        className="mx-auto flex h-16 max-w-[100rem] items-center justify-between px-6 sm:px-10 md:h-20"
      >
        <a
          href="#top"
          className="text-[0.72rem] tracking-[0.44em] text-paper uppercase sm:text-[0.8rem] sm:tracking-[0.5em]"
        >
          Bugatti
        </a>

        <ul className="flex items-center gap-6 sm:gap-9">
          {NAV_LINKS.map((link, i) => (
            <li
              key={link.href}
              // Phones keep only the last two entries, per the simplified nav.
              className={i < 2 ? "hidden sm:block" : ""}
            >
              <a
                href={link.href}
                className="label text-paper/55 transition-colors duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-paper"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
