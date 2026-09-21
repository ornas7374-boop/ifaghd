"use client";
import { motion } from "framer-motion";
import { Section, SectionHeader } from "./Section";

const kpis = [
  { n: "12+", ar: "مواقع تم إطلاقها" },
  { n: "100%", ar: "التسليم في الوقت" },
  { n: "9.2", ar: "متوسط تقييم NPS" },
  { n: "8", ar: "مشتركو CARE النشطون" },
];

const logos = ["MADAR", "ORCHID", "RUKN", "NOOR & CO", "HAYA", "SAFRA", "NAWA"];

export function Traction() {
  return (
    <Section id="traction" className="border-y border-white/5 bg-[color:var(--ink-2)]/40">
      <SectionHeader
        eyebrow="TRACTION · إثبات حقيقي"
        title={<>أرقام صغيرة، لكنها حقيقية.</>}
        subtitle="بدأنا مع دفعة Beta محدودة. النتائج تتكلم بدل ما نتكلم عنها."
      />

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6">
        {kpis.map((k, i) => (
          <motion.div
            key={k.ar}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay: i * 0.08 }}
            className={`relative rounded-2xl border p-6 sm:p-8 ${
              i === 1
                ? "border-[color:var(--mint)]/40 bg-[color:var(--mint)]/[0.06]"
                : "border-white/8 bg-[color:var(--panel)]/60"
            }`}
          >
            <div
              className={`text-4xl font-bold sm:text-5xl ${i === 1 ? "text-[color:var(--mint)]" : "text-white"}`}
              style={{ fontFamily: "var(--font-jetbrains)" }}
            >
              {k.n}
            </div>
            <div
              className="mt-3 text-sm text-white/60"
              style={{ fontFamily: "var(--font-ibm-arabic)" }}
              dir="rtl"
            >
              {k.ar}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Marquee of client logos */}
      <div className="relative mt-16 overflow-hidden border-y border-white/8 py-6">
        <div className="marquee-track flex w-max gap-16 whitespace-nowrap">
          {[...logos, ...logos].map((l, i) => (
            <span
              key={i}
              className="text-2xl font-medium text-white/35 tracking-[0.3em] transition hover:text-white/70"
              style={{ fontFamily: "var(--font-space-grotesk)" }}
            >
              {l}
            </span>
          ))}
        </div>
      </div>

      {/* Testimonial */}
      <motion.figure
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="mx-auto mt-16 max-w-3xl text-center"
        dir="rtl"
      >
        <blockquote
          className="text-2xl leading-relaxed text-white sm:text-3xl"
          style={{ fontFamily: "var(--font-ibm-arabic)" }}
        >
          <span className="text-[color:var(--mint)]">&ldquo;</span>
          أطلقنا موقعنا الجديد في 6 أيام، ونسبة الحجوزات زادت 40% في أول شهر. جودة تصميم ما شفتها بأي وكالة سعودية.
          <span className="text-[color:var(--mint)]">&rdquo;</span>
        </blockquote>
        <figcaption
          className="mt-6 text-sm uppercase tracking-[0.25em] text-white/50"
          style={{ fontFamily: "var(--font-jetbrains)" }}
        >
          — BETA CLIENT · CLINIC IN RIYADH
        </figcaption>
      </motion.figure>
    </Section>
  );
}
