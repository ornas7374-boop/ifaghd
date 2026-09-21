"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Section } from "./Section";
import { AuraDot } from "./AuraDot";

const budgets = ["LAUNCH · 5,999 SAR", "GROW · 12,999 SAR", "SCALE · 24,999 SAR", "غير متأكد بعد"];
const timelines = ["أسرع ما يمكن", "خلال شهر", "خلال ٣ أشهر"];

export function CTA() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <Section id="cta" className="relative overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(circle at 30% 30%, rgba(109,40,217,0.35) 0%, transparent 55%), radial-gradient(circle at 70% 70%, rgba(62,232,180,0.2) 0%, transparent 55%)",
          filter: "blur(30px)",
        }}
      />
      <div aria-hidden className="bg-grid absolute inset-0 opacity-30" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.7 }}
        className="relative mx-auto max-w-4xl rounded-[36px] border border-white/12 bg-[color:var(--panel)]/85 p-8 backdrop-blur-2xl sm:p-14"
      >
        <div className="flex flex-col items-center gap-6 text-center">
          <AuraDot size={56} />
          <div
            className="text-xs uppercase tracking-[0.32em] text-[color:var(--mint)]"
            style={{ fontFamily: "var(--font-jetbrains)" }}
          >
            START YOUR PROJECT · ابدأ مشروعك
          </div>
          <h2
            className="text-3xl leading-[1.15] font-bold text-white sm:text-5xl"
            style={{ fontFamily: "var(--font-ibm-arabic)" }}
            dir="rtl"
          >
            جاهز تُطلق موقعك في <span className="mint-glow">7 أيام</span>؟
          </h2>
          <p className="max-w-xl text-lg text-white/70" dir="rtl">
            امْلأ النموذج، ونرجعلك بتقييم مجاني + موعد مكالمة قصيرة (١٥ دقيقة) خلال ٢٤ ساعة.
          </p>
        </div>

        {submitted ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="mt-10 rounded-2xl border border-[color:var(--mint)]/30 bg-[color:var(--mint)]/[0.06] p-8 text-center"
            dir="rtl"
          >
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[color:var(--mint)] text-[color:var(--ink)]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="mt-4 text-xl font-bold text-white" style={{ fontFamily: "var(--font-ibm-arabic)" }}>
              وصلَتنا رسالتك ✦
            </div>
            <p className="mt-2 text-white/70">
              نرجعلك خلال ٢٤ ساعة على الإيميل بموعد مكالمة.
            </p>
          </motion.div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSubmitted(true);
            }}
            className="mt-10 grid gap-4"
            dir="rtl"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="اسمك الكامل" name="name" placeholder="اسمك ثلاثي" required />
              <Field label="اسم شركتك" name="company" placeholder="Company Ltd." required />
              <Field label="الإيميل" name="email" type="email" placeholder="you@company.sa" required />
              <Field label="واتساب / جوال" name="phone" placeholder="+966 5X XXX XXXX" required />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Select label="الميزانية" name="budget" options={budgets} />
              <Select label="الجدول الزمني" name="timeline" options={timelines} />
            </div>

            <label className="mt-2 block">
              <span
                className="mb-2 block text-xs uppercase tracking-[0.22em] text-white/60"
                style={{ fontFamily: "var(--font-jetbrains)" }}
              >
                عن مشروعك (سطرين كافيين)
              </span>
              <textarea
                name="message"
                rows={4}
                placeholder="نوع النشاط، أهم هدف من الموقع، أي مرجع بصري تحبه"
                className="w-full resize-none rounded-2xl border border-white/12 bg-[color:var(--ink-2)]/60 px-4 py-3 text-base text-white placeholder:text-white/30 outline-none transition focus:border-[color:var(--mint)] focus:bg-[color:var(--ink-2)]"
              />
            </label>

            <button
              type="submit"
              className="mt-4 inline-flex items-center justify-center gap-3 rounded-full bg-[color:var(--mint)] px-8 py-4 text-base font-bold text-[color:var(--ink)] shadow-[0_20px_60px_rgba(62,232,180,0.35)] transition hover:brightness-110"
            >
              أرسل الطلب
              <span aria-hidden>←</span>
            </button>
            <p className="text-center text-xs text-white/50">
              بإرسال النموذج، أنت توافق على استلام رد منا عبر الإيميل أو الواتساب فقط.
            </p>
          </form>
        )}
      </motion.div>
    </Section>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span
        className="mb-2 block text-xs uppercase tracking-[0.22em] text-white/60"
        style={{ fontFamily: "var(--font-jetbrains)" }}
      >
        {label}
      </span>
      <input
        type={type}
        name={name}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-white/12 bg-[color:var(--ink-2)]/60 px-4 py-3 text-base text-white placeholder:text-white/30 outline-none transition focus:border-[color:var(--mint)] focus:bg-[color:var(--ink-2)]"
      />
    </label>
  );
}

function Select({ label, name, options }: { label: string; name: string; options: string[] }) {
  return (
    <label className="block">
      <span
        className="mb-2 block text-xs uppercase tracking-[0.22em] text-white/60"
        style={{ fontFamily: "var(--font-jetbrains)" }}
      >
        {label}
      </span>
      <select
        name={name}
        defaultValue=""
        className="w-full appearance-none rounded-2xl border border-white/12 bg-[color:var(--ink-2)]/60 px-4 py-3 text-base text-white outline-none transition focus:border-[color:var(--mint)]"
      >
        <option value="" disabled>
          اختر...
        </option>
        {options.map((o) => (
          <option key={o} value={o} className="bg-[color:var(--ink)]">
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}
