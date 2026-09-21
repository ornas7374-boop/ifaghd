"use client";
import { motion } from "framer-motion";
import { AuraDot } from "./AuraDot";

const stat = { rev: 0.5, ease: [0.22, 1, 0.36, 1] as const };

export function Hero() {
  return (
    <section id="top" className="relative isolate min-h-[100svh] overflow-hidden pt-32 pb-24">
      {/* radial atmospheres */}
      <div
        aria-hidden
        className="drift-a absolute -top-40 -right-40 h-[900px] w-[900px] rounded-full opacity-70"
        style={{
          background: "radial-gradient(circle, rgba(109,40,217,0.55) 0%, transparent 55%)",
          filter: "blur(30px)",
        }}
      />
      <div
        aria-hidden
        className="drift-b absolute -bottom-40 -left-40 h-[800px] w-[800px] rounded-full opacity-70"
        style={{
          background: "radial-gradient(circle, rgba(62,232,180,0.25) 0%, transparent 55%)",
          filter: "blur(40px)",
        }}
      />
      <div aria-hidden className="bg-grid absolute inset-0 opacity-40" />

      <div className="relative mx-auto grid max-w-7xl gap-14 px-6 lg:grid-cols-12 lg:gap-8 lg:px-10">
        {/* Copy */}
        <div className="lg:col-span-7 lg:pt-8" dir="rtl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: stat.ease }}
            className="mb-6 inline-flex items-center gap-3 rounded-full border border-[color:var(--mint)]/30 bg-[color:var(--mint)]/[0.06] px-4 py-2"
          >
            <span className="h-2 w-2 rounded-full bg-[color:var(--mint)] shadow-[0_0_12px_var(--mint)]" />
            <span
              className="font-medium tracking-[0.2em] text-[color:var(--mint)] text-xs"
              style={{ fontFamily: "var(--font-jetbrains), var(--font-mono)" }}
            >
              PITCH DECK · READY V1.0
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.05, ease: stat.ease }}
            className="grad-text text-[44px] leading-[1.05] font-bold sm:text-6xl lg:text-[76px]"
            style={{ fontFamily: "var(--font-ibm-arabic), var(--font-display-ar)" }}
          >
            مواقع لها حضور.
            <br />
            <span className="text-white">في 7 أيام. بضمان.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: stat.ease }}
            className="mt-6 max-w-2xl text-lg leading-relaxed text-white/70 sm:text-xl"
          >
            استوديو مواقع مبني على الذكاء الاصطناعي. نصمّم مواقع{" "}
            <span className="text-white">premium ثنائية اللغة</span> لأصحاب الأعمال في السعودية والخليج
            — بأسعار ثابتة، بمواعيد مضمونة، وبدعم عربي أصيل من الأساس.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25, ease: stat.ease }}
            className="mt-10 flex flex-col gap-4 sm:flex-row"
          >
            <a
              href="#pricing"
              className="group inline-flex items-center justify-center gap-3 rounded-full bg-[color:var(--mint)] px-8 py-4 text-base font-semibold text-[color:var(--ink)] shadow-[0_20px_60px_rgba(62,232,180,0.35)] transition hover:brightness-110"
            >
              شوف الباقات
              <span className="transition group-hover:-translate-x-1" aria-hidden>
                ←
              </span>
            </a>
            <a
              href="#process"
              className="inline-flex items-center justify-center gap-3 rounded-full border border-white/15 bg-white/[0.02] px-8 py-4 text-base font-medium text-white transition hover:border-white/30 hover:bg-white/[0.04]"
            >
              كيف يشتغل؟
            </a>
          </motion.div>

          {/* Micro trust bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-12 grid max-w-xl grid-cols-3 gap-6 border-t border-white/10 pt-6"
          >
            {[
              { n: "7–21", l: "يوم تسليم" },
              { n: "100%", l: "بضمان" },
              { n: "AR·EN", l: "ثنائي اللغة" },
            ].map((k) => (
              <div key={k.l}>
                <div
                  className="text-2xl font-bold text-white sm:text-3xl"
                  style={{ fontFamily: "var(--font-jetbrains), var(--font-mono)" }}
                >
                  {k.n}
                </div>
                <div className="mt-1 text-xs uppercase tracking-[0.2em] text-white/50">{k.l}</div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Visual — big Aura + browser card */}
        <div className="relative lg:col-span-5">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.1, ease: stat.ease }}
            className="relative mx-auto flex aspect-square max-w-[520px] items-center justify-center"
          >
            <div
              aria-hidden
              className="absolute inset-6 rounded-full"
              style={{
                background:
                  "conic-gradient(from 180deg, rgba(109,40,217,0.35), rgba(62,232,180,0.35), rgba(109,40,217,0.35))",
                filter: "blur(30px)",
              }}
            />
            <AuraDot size={140} />

            {/* Floating browser chrome */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.35 }}
              className="absolute -bottom-6 -right-6 w-[280px] rounded-2xl border border-white/10 bg-[color:var(--panel)]/90 p-4 shadow-[0_30px_80px_rgba(0,0,0,0.5)] backdrop-blur-xl sm:w-[320px]"
            >
              <div className="mb-3 flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
                <span
                  className="ml-3 truncate text-[10px] uppercase tracking-widest text-white/40"
                  style={{ fontFamily: "var(--font-jetbrains)" }}
                >
                  webora.io
                </span>
              </div>
              <div className="space-y-2">
                <div className="h-3 w-3/4 rounded bg-white/10" />
                <div className="h-3 w-1/2 rounded bg-white/10" />
                <div className="mt-4 flex gap-2">
                  <div className="h-8 flex-1 rounded-lg bg-[color:var(--violet)]/60" />
                  <div className="h-8 w-16 rounded-lg bg-[color:var(--mint)]" />
                </div>
              </div>
            </motion.div>

            {/* Floating tag "7 DAYS" */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.5 }}
              className="absolute -top-4 -left-4 flex items-center gap-2 rounded-full border border-[color:var(--mint)]/40 bg-[color:var(--ink-2)]/90 px-4 py-2 shadow-lg backdrop-blur"
            >
              <span className="text-[color:var(--mint)]">⚡</span>
              <span
                className="text-sm font-semibold text-white tracking-wide"
                style={{ fontFamily: "var(--font-jetbrains)" }}
              >
                7 DAYS
              </span>
            </motion.div>

            {/* Floating tag "SAR" */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.55 }}
              className="absolute top-8 -right-2 rounded-2xl border border-white/10 bg-[color:var(--panel-2)]/90 px-4 py-3 shadow-lg backdrop-blur"
            >
              <div className="text-[10px] uppercase tracking-widest text-white/50" style={{ fontFamily: "var(--font-jetbrains)" }}>
                FROM
              </div>
              <div className="text-xl font-bold text-white" style={{ fontFamily: "var(--font-jetbrains)" }}>
                5,999 <span className="text-xs text-white/50">SAR</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
