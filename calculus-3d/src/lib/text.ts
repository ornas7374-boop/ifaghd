// Arabic-aware normalisation for search: strips diacritics/tatweel and unifies letter variants.
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/\\[a-z]+/g, (m) => ' ' + m.slice(1) + ' ')
    .replace(/[{}$^_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export const r = String.raw;

/** Format a number compactly for read-outs: integers stay integers, others get up to `d` decimals. */
export function fmt(x: number, d = 2): string {
  if (!isFinite(x)) return x > 0 ? '∞' : x < 0 ? '−∞' : '—';
  if (Math.abs(x - Math.round(x)) < 1e-9) return String(Math.round(x)).replace('-', '−');
  return Number(x.toFixed(d)).toString().replace('-', '−');
}

/** TeX-friendly number (uses ASCII minus, KaTeX renders it properly). */
export function tn(x: number, d = 2): string {
  if (!isFinite(x)) return x > 0 ? '\\infty' : '-\\infty';
  if (Math.abs(x - Math.round(x)) < 1e-9) return String(Math.round(x));
  return Number(x.toFixed(d)).toString();
}

/** Best simple fraction for x (denominators up to 12) as TeX, falling back to decimals. */
export function frac(x: number): string {
  if (!isFinite(x)) return tn(x);
  for (let q = 1; q <= 12; q++) {
    const p = Math.round(x * q);
    if (Math.abs(p / q - x) < 1e-9) {
      if (q === 1) return String(p);
      return (p < 0 ? '-' : '') + `\\tfrac{${Math.abs(p)}}{${q}}`;
    }
  }
  return tn(x, 3);
}
