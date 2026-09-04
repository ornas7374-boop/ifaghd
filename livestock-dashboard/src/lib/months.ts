export const ARABIC_MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

export const YEARLY_TOTAL_MONTH = 0;

export const MONTH_OPTIONS: { value: number; label: string }[] = [
  { value: YEARLY_TOTAL_MONTH, label: "الإجمالي السنوي" },
  ...ARABIC_MONTHS.map((name, i) => ({ value: i + 1, label: `${name} (${i + 1})` })),
];

export function monthLabel(month: number): string {
  if (month === YEARLY_TOTAL_MONTH) return "سنوي";
  return `${ARABIC_MONTHS[month - 1]} (${month})`;
}
