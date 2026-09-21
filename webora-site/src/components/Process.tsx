"use client";
import { motion } from "framer-motion";
import { Section, SectionHeader } from "./Section";

const steps = [
  { day: "DAY 0", en: "Brief", ar: "نموذج ذكي", body: "١٥ دقيقة نستوعب فيها العلامة، الجمهور، والأهداف. لا اجتماعات مطوّلة." },
  { day: "DAY 1–3", en: "Design", ar: "أول نسخة تصميم", body: "نسخة كاملة عالية الدقة على Figma / Framer، جاهزة للمراجعة والتعليق." },
  { day: "DAY 4–6", en: "Build", ar: "تطوير مع AI acceleration", body: "بناء responsive بيلينجوال (RTL أصلي)، مع SEO وسرعة مثالية." },
  { day: "DAY 7", en: "Launch", ar: "نشر + تدريب", body: "نشر على النطاق + جلسة تدريب على CMS + دعم ٣٠ يوم." },
];

export function Process() {
  return (
    <Section id="process">
      <SectionHeader
        eyebrow="HOW IT WORKS · كيف يشتغل"
        title={<>من الفكرة إلى الإطلاق في 4 خطوات.</>}
        subtitle="عملية واحدة، شفافة، بدون مفاجآت. تعرف بالضبط أين نحن كل يوم."
      />

      {/* Progress rail */}
      <div className="relative">
        <div className="absolute top-8 right-0 left-0 hidden h-[2px] bg-white/8 lg:block">
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, margin: "-120px" }}
            transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformOrigin: "right" }}
            className="h-full origin-right bg-gradient-to-l from-[color:var(--violet)] via-[color:var(--mint)] to-[color:var(--mint)] shadow-[0_0_20px_var(--mint)]"
          />
        </div>

        <div className="grid gap-8 lg:grid-cols-4 lg:gap-6" dir="rtl">
          {steps.map((s, i) => (
            <motion.div
              key={s.en}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
              className="relative"
            >
              <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-[color:var(--ink)] shadow-lg lg:mx-0">
                <div
                  className={`text-2xl font-bold ${i === 3 ? "text-[color:var(--mint)]" : "text-white"}`}
                  style={{ fontFamily: "var(--font-jetbrains)" }}
                >
                  {i + 1}
                </div>
                {i === 3 && (
                  <span className="absolute inset-0 rounded-2xl border-2 border-[color:var(--mint)] aura-pulse" />
                )}
              </div>

              <div className="mt-6 rounded-2xl border border-white/8 bg-[color:var(--panel)]/60 p-6 backdrop-blur">
                <div
                  className="text-xs uppercase tracking-[0.28em] text-[color:var(--muted)]"
                  style={{ fontFamily: "var(--font-jetbrains)" }}
                >
                  {s.day}
                </div>
                <div
                  className="mt-3 text-2xl font-bold text-white"
                  style={{ fontFamily: "var(--font-space-grotesk)" }}
                >
                  {s.en}
                </div>
                <div
                  className="mt-1 text-lg text-[color:var(--mint)]"
                  style={{ fontFamily: "var(--font-ibm-arabic)" }}
                >
                  {s.ar}
                </div>
                <p className="mt-4 text-sm leading-relaxed text-white/60">{s.body}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.6 }}
        className="mx-auto mt-14 max-w-3xl text-center text-lg text-white/70"
      >
        <span
          className="text-xs uppercase tracking-[0.2em] text-[color:var(--mint)]"
          style={{ fontFamily: "var(--font-jetbrains)" }}
        >
          SECRET SAUCE ·{" "}
        </span>
        إنتاج مسرَّع بالـ AI + إشراف بشري خبير ={" "}
        <span className="font-bold text-white">جودة وكالة بسرعة ١٠×</span>.
      </motion.p>
    </Section>
  );
}
