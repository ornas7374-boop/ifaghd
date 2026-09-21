"use client";
import { motion } from "framer-motion";
import { Section, SectionHeader } from "./Section";

const columns = [
  {
    tag: "Traditional Agencies",
    ar: "الوكالات التقليدية",
    rows: ["30K–80K SAR", "3–6 أشهر انتظار", "Discovery Phase™ بلا نهاية"],
  },
  {
    tag: "DIY Builders",
    ar: "منصات جاهزة",
    rows: ["تصاميم جنيريك", "دعم عربي ضعيف", "يكسر التصميم RTL"],
  },
  {
    tag: "Freelancers",
    ar: "فريلانسرز",
    rows: ["جودة غير ثابتة", "يختفون فجأة", "لا ضمانات"],
  },
];

export function Problem() {
  return (
    <Section id="problem">
      <SectionHeader
        eyebrow="THE PROBLEM · المشكلة"
        title={<>أصحاب الأعمال في MENA عالقين بين 3 خيارات سيئة.</>}
        subtitle="إما تدفع أكثر من اللازم، أو تظهر بمستوى أقل من هويتك، أو تراهن ومالك ووقتك."
      />

      <div className="grid gap-6 lg:grid-cols-3" dir="rtl">
        {columns.map((col, i) => (
          <motion.article
            key={col.tag}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="relative rounded-3xl border border-[color:var(--danger)]/25 bg-[color:var(--panel)]/70 p-8 backdrop-blur"
          >
            <div className="mb-6 flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-xl border border-[color:var(--danger)]/40 bg-[color:var(--danger)]/10 text-lg text-[color:var(--danger)]">
                ✕
              </span>
              <div>
                <div
                  className="text-sm uppercase tracking-[0.2em] text-[color:var(--danger)]"
                  style={{ fontFamily: "var(--font-jetbrains)" }}
                >
                  {col.tag}
                </div>
                <div className="mt-1 text-lg font-semibold text-white">{col.ar}</div>
              </div>
            </div>
            <ul className="space-y-3 text-white/75">
              {col.rows.map((r) => (
                <li key={r} className="flex items-start gap-3 border-t border-white/5 pt-3 first:border-t-0 first:pt-0">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[color:var(--danger)]" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </motion.article>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="mx-auto mt-14 max-w-2xl text-center"
      >
        <blockquote className="text-xl italic text-[color:var(--mint)] sm:text-2xl">
          &ldquo;You either overpay, undersell your brand, or gamble.&rdquo;
        </blockquote>
      </motion.div>
    </Section>
  );
}
