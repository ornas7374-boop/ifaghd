// المبالغ في قاعدة البيانات بالهللة (1 ر.س = 100 هللة)
const sar = new Intl.NumberFormat("ar-SA-u-nu-latn", { maximumFractionDigits: 2 });

export function formatSar(halalas: number): string {
  return `${sar.format(halalas / 100)} ر.س`;
}
