export function InstitutionInfo() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-hairline bg-surface px-5 py-3.5">
      <p className="text-sm font-bold text-[var(--series-1)]">
        جامعة القصيم — محطة الأبحاث والتجارب
      </p>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-ink-secondary">
        <span>
          <span className="text-ink-muted">رئيس القسم:</span>{" "}
          <span className="font-semibold text-ink">عبدالرحمن العواد</span>
        </span>
        <span>
          <span className="text-ink-muted">مشرف القسم:</span>{" "}
          <span className="font-semibold text-ink">منصور التويجري</span>
        </span>
      </div>
    </div>
  );
}
