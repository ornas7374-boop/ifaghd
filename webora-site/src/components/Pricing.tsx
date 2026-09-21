"use client";
import { motion } from "framer-motion";
import { Section, SectionHeader } from "./Section";

const tiers = [
  {
    name: "LAUNCH",
    price: 5999,
    days: "7 أيام",
    en: "Ship fast",
    ar: "أطلق بسرعة",
    features: ["5 صفحات", "ثنائي اللغة (AR/EN)", "Responsive على كل الأجهزة", "SEO أساسي", "ربط WhatsApp Business", "دعم 30 يوم"],
  },
  {
    name: "GROW",
    price: 12999,
    days: "14 يوم",
    en: "Look like the leader",
    ar: "اظهر كالقائد",
    highlighted: true,
    features: ["حتى 15 صفحة", "CMS مخصص للمحتوى", "مدونة / أخبار", "SEO متقدم + Schema", "Analytics + Heatmaps", "دعم 90 يوم"],
  },
  {
    name: "SCALE",
    price: 24999,
    days: "21 يوم",
    en: "Systems that sell",
    ar: "أنظمة تبيع",
    features: ["متجر / نظام حجوزات", "تكاملات مخصصة (CRM, ERP)", "انيميشن متقدم", "Marketing automation", "دعم 12 ساعة", "هوستنج سنة كاملة"],
  },
];

export function Pricing() {
  return (
    <Section id="pricing">
      <SectionHeader
        eyebrow="PACKAGES · الباقات"
        title={<>ثلاث باقات. أسعار شفافة. مواعيد مضمونة.</>}
        subtitle="اختر الباقة الأنسب لمرحلة عملك. تقدر تترقّى بأي وقت — بدون إعادة عمل."
      />

      <div className="grid gap-6 lg:grid-cols-3" dir="rtl">
        {tiers.map((t, i) => (
          <motion.article
            key={t.name}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, delay: i * 0.1 }}
            className={`tier-card relative rounded-3xl border p-8 backdrop-blur ${
              t.highlighted
                ? "border-[color:var(--mint)]/50 bg-gradient-to-b from-[color:var(--panel-2)] to-[color:var(--panel)] shadow-[0_20px_80px_rgba(62,232,180,0.15)]"
                : "border-white/8 bg-[color:var(--panel)]/70"
            }`}
          >
            {t.highlighted && (
              <div
                className="absolute -top-3.5 right-8 rounded-full bg-[color:var(--mint)] px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.25em] text-[color:var(--ink)]"
                style={{ fontFamily: "var(--font-jetbrains)" }}
              >
                الأكثر مبيعاً
              </div>
            )}
            <div className="flex items-center justify-between">
              <div
                className={`text-sm uppercase tracking-[0.32em] font-medium ${t.highlighted ? "text-[color:var(--mint)]" : "text-[color:var(--muted)]"}`}
                style={{ fontFamily: "var(--font-jetbrains)" }}
              >
                {t.name}
              </div>
              <div
                className="text-xs uppercase tracking-[0.2em] text-white/50"
                style={{ fontFamily: "var(--font-jetbrains)" }}
              >
                {t.days}
              </div>
            </div>

            <div className="mt-6 flex items-baseline gap-2">
              <span className="text-lg font-medium text-white/60" style={{ fontFamily: "var(--font-jetbrains)" }}>
                SAR
              </span>
              <span
                className="text-5xl font-bold text-white leading-none sm:text-6xl"
                style={{ fontFamily: "var(--font-jetbrains)" }}
              >
                {t.price.toLocaleString("en-US")}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-2 text-lg text-[color:var(--mint)]">
              <span style={{ fontFamily: "var(--font-ibm-arabic)" }}>{t.ar}</span>
              <span className="text-white/30">·</span>
              <span style={{ fontFamily: "var(--font-space-grotesk)" }}>{t.en}</span>
            </div>

            <ul className="mt-8 space-y-3">
              {t.features.map((f) => (
                <li key={f} className="flex items-start gap-3 border-t border-white/5 pt-3 first:border-t-0 first:pt-0">
                  <span className={`mt-1.5 grid h-5 w-5 shrink-0 place-items-center rounded-full ${t.highlighted ? "bg-[color:var(--mint)]/20 text-[color:var(--mint)]" : "bg-white/8 text-white/70"}`}>
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6.5L4.5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span className="text-white/80" style={{ fontFamily: "var(--font-ibm-arabic)" }}>
                    {f}
                  </span>
                </li>
              ))}
            </ul>

            <a
              href="#cta"
              className={`mt-8 flex items-center justify-center gap-2 rounded-full py-3.5 text-base font-semibold transition ${
                t.highlighted
                  ? "bg-[color:var(--mint)] text-[color:var(--ink)] hover:brightness-110"
                  : "border border-white/15 bg-white/[0.02] text-white hover:border-white/30 hover:bg-white/[0.04]"
              }`}
            >
              اختر {t.ar}
              <span aria-hidden>←</span>
            </a>
          </motion.article>
        ))}
      </div>

      {/* CARE subscription banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="mt-10 grid gap-6 rounded-3xl border border-white/10 bg-gradient-to-r from-[color:var(--violet)]/25 via-[color:var(--panel)]/40 to-[color:var(--mint)]/20 p-8 sm:grid-cols-[1fr_auto] sm:items-center sm:p-10"
      >
        <div dir="rtl">
          <div
            className="text-xs uppercase tracking-[0.3em] text-[color:var(--mint)]"
            style={{ fontFamily: "var(--font-jetbrains)" }}
          >
            SUBSCRIPTION · CARE
          </div>
          <div className="mt-3 text-2xl font-bold text-white sm:text-3xl" style={{ fontFamily: "var(--font-ibm-arabic)" }}>
            اشتراك الرعاية — راحة بال شهرية
          </div>
          <p className="mt-2 max-w-xl text-white/70">
            هوستنج + صيانة + 5 تعديلات + تقرير أداء + دعم أولوية. موقعك يشتغل دائماً بأفضل حال.
          </p>
        </div>
        <div className="text-right sm:text-center" dir="ltr">
          <div
            className="text-5xl font-bold text-[color:var(--mint)] sm:text-6xl"
            style={{ fontFamily: "var(--font-jetbrains)" }}
          >
            999
          </div>
          <div className="mt-1 text-sm text-white/60" style={{ fontFamily: "var(--font-jetbrains)" }}>
            SAR / month
          </div>
        </div>
      </motion.div>
    </Section>
  );
}
