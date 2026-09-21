"use client";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="border-t border-white/8 bg-[color:var(--ink-2)]">
      <div className="mx-auto max-w-7xl px-6 py-14 lg:px-10">
        <div className="grid gap-10 lg:grid-cols-4">
          {/* Brand column */}
          <div className="lg:col-span-2">
            <Logo size={30} bilingual />
            <p className="mt-6 max-w-md text-white/60" dir="rtl">
              استوديو تصميم مواقع مبني على الذكاء الاصطناعي — للسعودية والخليج. مواقع لها حضور، بأسعار ثابتة، بمواعيد مضمونة.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {[
                { name: "LinkedIn", href: "#" },
                { name: "Instagram", href: "#" },
                { name: "X", href: "#" },
                { name: "WhatsApp", href: "#" },
              ].map((s) => (
                <a
                  key={s.name}
                  href={s.href}
                  className="rounded-full border border-white/12 px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-white/60 transition hover:border-[color:var(--mint)] hover:text-[color:var(--mint)]"
                  style={{ fontFamily: "var(--font-jetbrains)" }}
                >
                  {s.name}
                </a>
              ))}
            </div>
          </div>

          {/* Nav column */}
          <div dir="rtl">
            <div
              className="mb-4 text-xs uppercase tracking-[0.28em] text-[color:var(--muted)]"
              style={{ fontFamily: "var(--font-jetbrains)" }}
            >
              المنتج
            </div>
            <ul className="space-y-2 text-white/70">
              <li><a href="#solution" className="hover:text-white">الحل</a></li>
              <li><a href="#process" className="hover:text-white">كيف يشتغل</a></li>
              <li><a href="#pricing" className="hover:text-white">الباقات</a></li>
              <li><a href="#faq" className="hover:text-white">الأسئلة الشائعة</a></li>
            </ul>
          </div>

          {/* Contact column */}
          <div dir="rtl">
            <div
              className="mb-4 text-xs uppercase tracking-[0.28em] text-[color:var(--muted)]"
              style={{ fontFamily: "var(--font-jetbrains)" }}
            >
              تواصل
            </div>
            <ul className="space-y-2 text-white/70">
              <li>
                <a href="mailto:hello@webora.io" className="inline-flex items-center gap-2 hover:text-[color:var(--mint)]" dir="ltr">
                  <span>✉</span> hello@webora.io
                </a>
              </li>
              <li>
                <a href="https://webora.io" className="inline-flex items-center gap-2 hover:text-[color:var(--mint)]" dir="ltr">
                  <span>◈</span> webora.io
                </a>
              </li>
              <li>
                <a href="tel:+966" className="inline-flex items-center gap-2 hover:text-[color:var(--mint)]" dir="ltr">
                  <span>☎</span> +966 XX XXX XXXX
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col-reverse items-start justify-between gap-4 border-t border-white/8 pt-6 sm:flex-row sm:items-center">
          <p
            className="text-xs text-white/40"
            style={{ fontFamily: "var(--font-jetbrains)" }}
          >
            © {new Date().getFullYear()} WEBORA · KSA & GCC · ALL RIGHTS RESERVED
          </p>
          <p
            className="text-xs uppercase tracking-[0.28em] text-[color:var(--mint)]/80"
            style={{ fontFamily: "var(--font-jetbrains)" }}
          >
            WEBSITES WITH AN AURA · مواقع لها حضور
          </p>
        </div>
      </div>
    </footer>
  );
}
