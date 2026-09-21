"use client";
import { motion } from "framer-motion";

// Shared section shell + eyebrow heading
export function SectionHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
}) {
  return (
    <div className="mx-auto mb-16 max-w-3xl text-center" dir="rtl">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
        className="inline-flex items-center gap-2 rounded-full border border-[color:var(--mint)]/25 bg-[color:var(--mint)]/[0.05] px-4 py-1.5"
      >
        <span
          className="text-xs uppercase tracking-[0.28em] text-[color:var(--mint)] font-medium"
          style={{ fontFamily: "var(--font-jetbrains)" }}
        >
          {eyebrow}
        </span>
      </motion.div>
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, delay: 0.05 }}
        className="mt-6 text-3xl leading-[1.15] font-bold text-white sm:text-4xl lg:text-5xl"
        style={{ fontFamily: "var(--font-ibm-arabic)" }}
      >
        {title}
      </motion.h2>
      {subtitle && (
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mt-5 text-lg leading-relaxed text-white/60"
        >
          {subtitle}
        </motion.p>
      )}
    </div>
  );
}

export function Section({
  id,
  children,
  className = "",
}: {
  id?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`relative py-24 sm:py-32 ${className}`}>
      <div className="mx-auto max-w-7xl px-6 lg:px-10">{children}</div>
    </section>
  );
}
