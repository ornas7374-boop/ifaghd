import { frac } from './text';

export interface Iv {
  lo: number; // may be -Infinity
  hi: number; // may be +Infinity
  loC: boolean;
  hiC: boolean;
}

const v = (x: number) => (x === -Infinity ? '-\\infty' : x === Infinity ? '\\infty' : frac(x));

export function ivTex(i: Iv): string {
  if (i.lo === i.hi) return `\\{${v(i.lo)}\\}`;
  const l = i.loC && Number.isFinite(i.lo) ? '[' : '(';
  const r = i.hiC && Number.isFinite(i.hi) ? ']' : ')';
  return `${l}${v(i.lo)},\\ ${v(i.hi)}${r}`;
}

export function setTex(list: Iv[]): string {
  if (!list.length) return '\\varnothing';
  if (list.length === 1 && list[0].lo === -Infinity && list[0].hi === Infinity) return '\\mathbb{R}=(-\\infty,\\infty)';
  return list.map(ivTex).join(' \\cup ');
}

/** Inequality form of one interval, e.g. "-2 \le x < 5". */
export function ineqTex(i: Iv, x = 'x'): string {
  if (i.lo === i.hi) return `${x} = ${v(i.lo)}`;
  const lf = Number.isFinite(i.lo);
  const hf = Number.isFinite(i.hi);
  if (!lf && !hf) return `-\\infty < ${x} < \\infty`;
  if (!lf) return `${x} ${i.hiC ? '\\le' : '<'} ${v(i.hi)}`;
  if (!hf) return `${x} ${i.loC ? '\\ge' : '>'} ${v(i.lo)}`;
  return `${v(i.lo)} ${i.loC ? '\\le' : '<'} ${x} ${i.hiC ? '\\le' : '<'} ${v(i.hi)}`;
}

export function builderTex(i: Iv): string {
  if (!Number.isFinite(i.lo) && !Number.isFinite(i.hi)) return '\\mathbb{R}';
  return `\\{x \\mid ${ineqTex(i)}\\}`;
}

export function isEmpty(i: Iv) {
  return i.lo > i.hi || (i.lo === i.hi && !(i.loC && i.hiC));
}

export function intersect(a: Iv, b: Iv): Iv[] {
  const lo = Math.max(a.lo, b.lo);
  const hi = Math.min(a.hi, b.hi);
  const loC = a.lo > b.lo ? a.loC : b.lo > a.lo ? b.loC : a.loC && b.loC;
  const hiC = a.hi < b.hi ? a.hiC : b.hi < a.hi ? b.hiC : a.hiC && b.hiC;
  const r = { lo, hi, loC, hiC };
  return isEmpty(r) ? [] : [r];
}

export function union(a: Iv, b: Iv): Iv[] {
  if (isEmpty(a)) return isEmpty(b) ? [] : [b];
  if (isEmpty(b)) return [a];
  const [p, q] = a.lo < b.lo || (a.lo === b.lo && a.loC) ? [a, b] : [b, a];
  const touching = p.hi > q.lo || (p.hi === q.lo && (p.hiC || q.loC));
  if (!touching) return [p, q];
  const hi = Math.max(p.hi, q.hi);
  const hiC = p.hi > q.hi ? p.hiC : q.hi > p.hi ? q.hiC : p.hiC || q.hiC;
  return [{ lo: p.lo, hi, loC: p.loC, hiC }];
}

/** Merge a sorted list of intervals/points into the minimal union. */
export function mergeAll(list: Iv[]): Iv[] {
  const s = list.filter((i) => !isEmpty(i)).sort((x, y) => x.lo - y.lo || (x.loC ? -1 : 1));
  const out: Iv[] = [];
  for (const i of s) {
    const last = out[out.length - 1];
    if (last) {
      const u = union(last, i);
      if (u.length === 1) {
        out[out.length - 1] = u[0];
        continue;
      }
    }
    out.push({ ...i });
  }
  return out;
}
