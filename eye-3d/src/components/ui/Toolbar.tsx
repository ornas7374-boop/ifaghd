"use client";

import { ResetIcon, SliceIcon, TagIcon } from "./icons";

interface Props {
  showLabels: boolean;
  showEnglish: boolean;
  crossSection: boolean;
  onReset: () => void;
  onToggleLabels: () => void;
  onToggleEnglish: () => void;
  onToggleCrossSection: () => void;
}

function ToolButton({
  active,
  label,
  onClick,
  children,
}: {
  active?: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`flex cursor-pointer items-center gap-1.5 rounded-xl px-2.5 py-2 text-[11.5px] font-bold transition ${
        active
          ? "bg-teal-400/20 text-teal-200 ring-1 ring-teal-400/40"
          : "text-slate-300 hover:bg-white/10 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

export default function Toolbar({
  showLabels,
  showEnglish,
  crossSection,
  onReset,
  onToggleLabels,
  onToggleEnglish,
  onToggleCrossSection,
}: Props) {
  return (
    <div className="pointer-events-auto flex items-center gap-1 rounded-2xl border border-white/10 bg-slate-950/70 p-1 shadow-2xl shadow-black/40 backdrop-blur-xl">
      <ToolButton label="إعادة ضبط زاوية العرض" onClick={onReset}>
        <ResetIcon className="size-4" />
        <span className="hidden sm:inline">إعادة الضبط</span>
      </ToolButton>
      <ToolButton active={showLabels} label="إظهار أو إخفاء أسماء الأجزاء" onClick={onToggleLabels}>
        <TagIcon className="size-4" />
        <span className="hidden sm:inline">الأسماء</span>
      </ToolButton>
      <ToolButton active={crossSection} label="عرض مقطع طولي في العين" onClick={onToggleCrossSection}>
        <SliceIcon className="size-4" />
        <span className="hidden sm:inline">مقطع تشريحي</span>
      </ToolButton>
      <span className="mx-0.5 h-5 w-px bg-white/10" />
      <ToolButton
        active={showEnglish}
        label={showEnglish ? "عرض المصطلحات بالعربية" : "عرض المصطلحات بالإنجليزية"}
        onClick={onToggleEnglish}
      >
        <span className="px-0.5 font-black">{showEnglish ? "ع" : "EN"}</span>
      </ToolButton>
    </div>
  );
}
