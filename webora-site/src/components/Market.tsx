"use client";
import { motion } from "framer-motion";
import { Section, SectionHeader } from "./Section";

const industries = [
  { name: "مطاعم وسلاسل F&B", icon: "🍽" },
  { name: "عيادات وميدسبا", icon: "◉" },
  { name: "استشارات ووكالات", icon: "◇" },
  { name: "عقارات وتطوير", icon: "◈" },
  { name: "نوادي رياضية وويلنس", icon: "◐" },
  { name: "Ed-tech ومراكز تدريب", icon: "◑" },
];

const stats = [
  { n: "75%", ar: "من مستهلكي السعودية يبحثون أونلاين قبل الشراء", src: "Google MENA" },
  { n: "83%", ar: "من الشركات الصغيرة بدون موقع احترافي", src: "Statista MENA" },
  { n: "13.4%", ar: "نمو سنوي (CAGR) لسوق تصميم المواقع", src: "IBISWorld" },
];

export function Market() {
  return (
    <Section id="market">
      <SectionHeader
        eyebrow="TARGET · الجمهور"
        title={<>مصمَّم للمؤسس الجاد.</>}
        subtitle="صاحب عمل خليجي، شركته 1–5 سنوات، إيراداتها 500K–10M ريال، يستحق حضور رقمي يعكس طموحه."
      />

      <div className="grid gap-10 lg:grid-cols-5">
        {/* Industries */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="rounded-3xl border border-white/8 bg-[color:var(--panel)]/70 p-8 backdrop-blur lg:col-span-3"
          dir="rtl"
        >
          <div
            className="text-xs uppercase tracking-[0.28em] text-[color:var(--mint)]"
            style={{ fontFamily: "var(--font-jetbrains)" }}
          >
            INDUSTRIES · القطاعات
          </div>
          <h3 className="mt-3 text-2xl font-bold text-white sm:text-3xl" style={{ fontFamily: "var(--font-ibm-arabic)" }}>
            نبني لسِتّ قطاعات نفهمها عن ظهر قلب.
          </h3>

          <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {industries.map((ind, i) => (
              <motion.li
                key={ind.name}
                initial={{ opacity: 0, x: 10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="group flex items-center gap-3 rounded-2xl border border-white/8 bg-[color:var(--ink-2)]/50 p-4 transition-all hover:border-[color:var(--mint)]/40 hover:bg-[color:var(--ink-2)]"
              >
                <span
                  className="grid h-10 w-10 place-items-center rounded-xl text-[color:var(--mint)]"
                  style={{ background: "rgba(62,232,180,0.1)" }}
                >
                  {ind.icon}
                </span>
                <span className="text-base text-white/85" style={{ fontFamily: "var(--font-ibm-arabic)" }}>
                  {ind.name}
                </span>
              </motion.li>
            ))}
          </ul>
        </motion.div>

        {/* Data */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="rounded-3xl border border-white/8 bg-gradient-to-br from-[color:var(--panel)] to-[color:var(--ink-2)] p-8 backdrop-blur lg:col-span-2"
          dir="rtl"
        >
          <div
            className="text-xs uppercase tracking-[0.28em] text-[color:var(--mint)]"
            style={{ fontFamily: "var(--font-jetbrains)" }}
          >
            MARKET DATA · الأرقام
          </div>
          <h3 className="mt-3 text-2xl font-bold text-white sm:text-3xl" style={{ fontFamily: "var(--font-ibm-arabic)" }}>
            سوق يزيد. عرض مكسور.
          </h3>

          <div className="mt-8 space-y-6">
            {stats.map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 + i * 0.1 }}
                className="border-t border-white/8 pt-6 first:border-t-0 first:pt-0"
              >
                <div className="flex items-baseline gap-3">
                  <div
                    className="text-4xl font-bold text-[color:var(--mint)] sm:text-5xl"
                    style={{ fontFamily: "var(--font-jetbrains)" }}
                  >
                    {s.n}
                  </div>
                </div>
                <p className="mt-2 text-sm text-white/70" style={{ fontFamily: "var(--font-ibm-arabic)" }}>
                  {s.ar}
                </p>
                <p
                  className="mt-1 text-[10px] uppercase tracking-[0.2em] text-white/40"
                  style={{ fontFamily: "var(--font-jetbrains)" }}
                >
                  SRC · {s.src}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </Section>
  );
}
