"use client";

import { LAYER_GROUPS, type EyePart } from "@/data/eyeParts";
import { BackIcon, CloseIcon, EyeIcon, EyeOffIcon, SparkIcon, StethoscopeIcon } from "./icons";

interface Props {
  part: EyePart;
  hidden: boolean;
  onClose: () => void;
  onToggleVisibility: () => void;
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-2 text-xs font-bold tracking-wide text-teal-300">
        {icon}
        {title}
      </h3>
      <div className="text-[13.5px] leading-relaxed text-slate-300">{children}</div>
    </section>
  );
}

export default function InfoCard({ part, hidden, onClose, onToggleVisibility }: Props) {
  return (
    <article key={part.id} className="animate-rise flex h-full flex-col">
      <header className="flex items-start gap-3 border-b border-white/10 p-4 pb-4">
        <span
          className="mt-1 size-3.5 shrink-0 rounded-full ring-2 ring-white/20"
          style={{ background: part.color }}
        />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-black text-white">{part.nameAr}</h2>
          <p className="truncate text-xs font-medium text-slate-400">
            {part.nameEn} <span className="text-slate-600">·</span>{" "}
            <span className="italic text-slate-500">{part.nameLa}</span>
          </p>
          <span className="mt-2 inline-block rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-slate-300 ring-1 ring-white/10">
            {LAYER_GROUPS[part.group].ar}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onToggleVisibility}
            title={hidden ? "إظهار هذا الجزء" : "إخفاء هذا الجزء"}
            aria-label={hidden ? "إظهار هذا الجزء" : "إخفاء هذا الجزء"}
            className="grid size-8 place-items-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-teal-300"
          >
            {hidden ? <EyeOffIcon /> : <EyeIcon />}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق البطاقة"
            className="grid size-8 place-items-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            <span className="hidden lg:block">
              <CloseIcon />
            </span>
            <span className="lg:hidden">
              <BackIcon />
            </span>
          </button>
        </div>
      </header>

      <div className="scroll-slim flex-1 space-y-5 overflow-y-auto p-4">
        <p className="rounded-xl bg-teal-400/10 p-3 text-[13.5px] font-medium leading-relaxed text-teal-100 ring-1 ring-teal-400/20">
          {part.taglineAr}
        </p>

        <Section title="الوظيفة">{part.functionAr}</Section>
        <Section title="الوصف الطبي">{part.descriptionAr}</Section>

        <Section title="أهم المعلومات" icon={<SparkIcon className="size-3.5" />}>
          <ul className="space-y-2">
            {part.factsAr.map((fact) => (
              <li key={fact} className="flex gap-2">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-teal-400/70" />
                <span>{fact}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="ملاحظة سريرية" icon={<StethoscopeIcon className="size-3.5" />}>
          <p className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 text-amber-100/90">
            {part.clinicalAr}
          </p>
        </Section>
      </div>

      <footer className="border-t border-white/10 p-3">
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-xl bg-white/5 py-2.5 text-sm font-bold text-slate-200 ring-1 ring-white/10 transition hover:bg-white/10 hover:text-white"
        >
          إغلاق والعودة إلى النموذج
        </button>
      </footer>
    </article>
  );
}
