"use client";
import { motion } from "framer-motion";
import { Section, SectionHeader } from "./Section";
import { AuraDot } from "./AuraDot";

const pillars = [
  {
    tag: "SPEED",
    icon: "⚡",
    en: "7–21 days",
    ar: "يوم تسليم مضمون — بدون تأخير.",
    body: "AI-accelerated production + curation بشرية خبيرة. نُطلق بأيام، لا بأشهر.",
  },
  {
    tag: "PRICE",
    icon: "◈",
    en: "Fixed pricing",
    ar: "أسعار ثابتة. صفر مفاجآت.",
    body: "٥,٩٩٩ / ١٢,٩٩٩ / ٢٤,٩٩٩ ريال — تعرف السعر قبل ما نبدأ.",
  },
  {
    tag: "BILINGUAL",
    icon: "◐",
    en: "Arabic-native",
    ar: "ثنائي اللغة من الأساس.",
    body: "العربية ليست ترجمة — هي مبنية داخل النظام من أول سطر تصميم.",
  },
];

export function Solution() {
  return (
    <Section id="solution">
      <SectionHeader
        eyebrow="THE SOLUTION · الحل"
        title={<>Webora — استوديو تصميم مواقع منتَج.</>}
        subtitle="نفس جودة الوكالات الكبرى، بسرعة وشفافية شركة SaaS. مبني للسوق الخليجي من الصفر."
      />

      <div className="grid gap-6 md:grid-cols-3" dir="rtl">
        {pillars.map((p, i) => (
          <motion.article
            key={p.tag}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="group relative overflow-hidden rounded-3xl border border-white/8 bg-[color:var(--panel)]/70 p-8 backdrop-blur transition-all hover:border-[color:var(--mint)]/40"
          >
            <div
              aria-hidden
              className="absolute -top-24 -right-24 h-48 w-48 rounded-full opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              style={{ background: "radial-gradient(circle, rgba(62,232,180,0.35), transparent 60%)", filter: "blur(20px)" }}
            />
            <div className="relative flex items-center gap-4">
              <span
                className="grid h-16 w-16 place-items-center rounded-2xl text-2xl text-white shadow-lg"
                style={{ background: "linear-gradient(135deg, var(--violet), var(--mint))" }}
              >
                {p.icon}
              </span>
              <div>
                <div
                  className="text-xs uppercase tracking-[0.3em] text-[color:var(--mint)]"
                  style={{ fontFamily: "var(--font-jetbrains)" }}
                >
                  {p.tag} · {String(i + 1).padStart(2, "0")}
                </div>
                <div
                  className="mt-1.5 text-2xl font-bold text-white"
                  style={{ fontFamily: "var(--font-space-grotesk)" }}
                >
                  {p.en}
                </div>
              </div>
            </div>
            <p
              className="mt-6 text-lg font-medium text-white"
              style={{ fontFamily: "var(--font-ibm-arabic)" }}
            >
              {p.ar}
            </p>
            <p className="mt-3 text-white/60">{p.body}</p>
          </motion.article>
        ))}
      </div>

      {/* Tagline banner */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7 }}
        className="relative mt-16 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-[color:var(--violet)]/25 via-transparent to-[color:var(--mint)]/20 p-8 text-center sm:p-12"
      >
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-6">
          <AuraDot size={44} />
          <p
            className="text-2xl font-medium leading-relaxed text-white sm:text-3xl"
            style={{ fontFamily: "var(--font-space-grotesk)" }}
          >
            <span className="text-white/60">Fast.</span>{" "}
            <span className="text-white/70">Fixed.</span>{" "}
            <span className="text-white/80">Bilingual.</span>{" "}
            <span className="text-[color:var(--mint)] font-bold">Guaranteed.</span>
          </p>
        </div>
      </motion.div>
    </Section>
  );
}
