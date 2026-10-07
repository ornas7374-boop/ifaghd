// صيغ العدد في العربية
export function placesCount(n: number) {
  if (n === 0) return "لا توجد نتائج";
  if (n === 1) return "مكان واحد";
  if (n === 2) return "مكانان";
  if (n <= 10) return `${n} أماكن`;
  return `${n} مكانًا`;
}
