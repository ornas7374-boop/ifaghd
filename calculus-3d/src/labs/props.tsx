import { useEffect, useMemo, useRef, useState } from 'react';
import { Btn, Choice, Row, Slider, Toggle } from '../components/Controls';
import { LabShell } from '../components/LabShell';
import { RichInline, Tex } from '../components/Tex';
import { fmt, tn } from '../lib/text';
import { FitCamera } from '../three/core';
import { Plot3D, PlotCurve, PlotHLine, PlotParam, PlotPoint, PlotSegment, PlotText, type Fn } from '../three/Plot3D';

const ICE = '#8fd3ff';
const AMBER = '#ffb547';
const GOOD = '#5fe3a1';
const BAD = '#ff6b7a';
const MINT = '#5ee6b5';

/* ───────────────────────── Increasing / decreasing, even / odd ───────────────────────── */

const SYM_FNS: { id: string; tex: string; f: Fn }[] = [
  { id: 'q', tex: 'x^4-3x^2', f: (x) => x ** 4 - 3 * x * x },
  { id: 'c', tex: 'x^3-x', f: (x) => x ** 3 - x },
  { id: 'n', tex: '2x-x^2', f: (x) => 2 * x - x * x },
  { id: 'p5', tex: 'x^5-4x^3+x', f: (x) => x ** 5 - 4 * x ** 3 + x },
  { id: 'cos', tex: '\\cos x', f: Math.cos },
  { id: 'abs', tex: '|x|', f: Math.abs },
  { id: 'lin', tex: '-3x+7', f: (x) => -3 * x + 7 },
];

function classify(f: Fn) {
  const xs = [0.3, 0.7, 1.1, 1.6, 2.2, 2.9];
  const even = xs.every((x) => Math.abs(f(-x) - f(x)) < 1e-9);
  const odd = xs.every((x) => Math.abs(f(-x) + f(x)) < 1e-9);
  return even ? 'even' : odd ? 'odd' : 'neither';
}

/** Numerical turning points on [-3, 3] → list of monotone stretches. */
function monotone(f: Fn) {
  const n = 1200;
  const a = -3;
  const b = 3;
  const d = (x: number) => (f(x + 1e-5) - f(x - 1e-5)) / 2e-5;
  const out: { from: number; to: number; inc: boolean }[] = [];
  let start = a;
  let inc = d(a + 1e-3) > 0;
  for (let i = 1; i <= n; i++) {
    const x = a + ((b - a) * i) / n;
    const now = d(x) > 0;
    if (now !== inc && Math.abs(d(x)) > 1e-7) {
      out.push({ from: start, to: x, inc });
      start = x;
      inc = now;
    }
  }
  out.push({ from: start, to: b, inc });
  return out;
}

export function SymmetryLab() {
  const [fid, setFid] = useState('q');
  const [mirror, setMirror] = useState(true);
  const [rot, setRot] = useState(false);
  const [mono, setMono] = useState(false);
  const [x0, setX0] = useState(1.5);
  const F = SYM_FNS.find((s) => s.id === fid)!;
  const kind = classify(F.f);
  const mirrorFn = useMemo(() => (x: number) => F.f(-x), [F]);
  const rotFn = useMemo(() => (x: number) => -F.f(-x), [F]);
  const colorAt = useMemo(() => {
    const d = (x: number) => F.f(x + 1e-4) - F.f(x - 1e-4);
    return (x: number) => (d(x) >= 0 ? GOOD : BAD);
  }, [F]);
  const runs = useMemo(() => monotone(F.f), [F]);
  const r2 = (v: number) => (Math.abs(v) >= 2.999 ? (v < 0 ? '-3' : '3') : fmt(v, 2));
  return (
    <LabShell
      scene={
        <>
          <FitCamera width={7.6} height={6.2} />
          <Plot3D x={[-3, 3]} y={[-6, 8]} width={7} height={5.8}>
            {mirror && <PlotCurve fn={mirrorFn} color="#ffffff" opacity={0.35} radius={0.06} z={-0.05} />}
            {rot && <PlotCurve fn={rotFn} color={AMBER} opacity={0.4} radius={0.06} z={-0.05} />}
            <PlotCurve fn={F.f} color={ICE} colorAt={mono ? colorAt : undefined} />
            <PlotPoint x={x0} y={F.f(x0)} color={MINT} label="$P$" />
            <PlotPoint x={-x0} y={F.f(-x0)} color={AMBER} label="$P'$" />
            <PlotSegment from={[x0, F.f(x0)]} to={[-x0, F.f(-x0)]} color="#9fb0c8" dashed opacity={0.7} />
          </Plot3D>
        </>
      }
      readout={
        <div className="readout-eq">
          <Tex tex={`f(x)=${F.tex}`} block />
          <Tex tex={`f(${tn(x0)}) = ${fmt(F.f(x0), 3)},\\qquad f(${tn(-x0)}) = ${fmt(F.f(-x0), 3)}`} block />
          <p className={`readout-note ${kind === 'neither' ? 'warn' : ''}`}>
            <RichInline
              text={
                kind === 'even'
                  ? '**زوجية**: $f(-x)=f(x)$ — المنحنى ومرآته حول محور $y$ ينطبقان.'
                  : kind === 'odd'
                    ? '**فردية**: $f(-x)=-f(x)$ — دوران المنحنى 180° حول نقطة الأصل ينطبق عليه.'
                    : '**ليست زوجية ولا فردية**: المرآة لا تنطبق والدوران لا ينطبق.'
              }
            />
          </p>
          {mono && (
            <p className="readout-note">
              <RichInline
                text={`تقريبًا على $[-3,3]$: ${runs.map((r) => `${r.inc ? 'متزايدة' : 'متناقصة'} على $(${r2(r.from)},\\ ${r2(r.to)})$`).join('، ')}`}
              />
            </p>
          )}
        </div>
      }
      controls={
        <>
          <Choice label="الدالة" value={fid} onChange={setFid} options={SYM_FNS.map((s) => ({ value: s.id, label: `$${s.tex}$` }))} />
          <Slider label="النقطة $x$" value={x0} min={0} max={2.8} step={0.1} onChange={setX0} />
          <Toggle label="أظهر المرآة حول محور $y$ (الشبح الأبيض)" checked={mirror} onChange={setMirror} />
          <Toggle label="أظهر الدوران 180° حول الأصل (الشبح البرتقالي)" checked={rot} onChange={setRot} />
          <Toggle label="لوّن التزايد (أخضر) والتناقص (أحمر)" checked={mono} onChange={setMono} />
        </>
      }
    />
  );
}

/* ───────────────────────── One-to-one & inverse ───────────────────────── */

const INV: { id: string; tex: string; f: Fn; dom: [number, number]; restrict?: [number, number]; inv: string; oneToOne: boolean; invTexR?: string; ticksPi?: boolean }[] = [
  { id: 'cube', tex: 'x^3', f: (x) => x ** 3, dom: [-4, 4], inv: '\\sqrt[3]{x}', oneToOne: true },
  { id: 'lin', tex: '2x+1', f: (x) => 2 * x + 1, dom: [-4, 4], inv: '\\dfrac{x-1}{2}', oneToOne: true },
  { id: 'exp', tex: 'e^x', f: Math.exp, dom: [-4, 4], inv: '\\ln x', oneToOne: true },
  { id: 'c2', tex: 'x^3+2', f: (x) => x ** 3 + 2, dom: [-4, 4], inv: '\\sqrt[3]{x-2}', oneToOne: true },
  { id: 'sq', tex: 'x^2', f: (x) => x * x, dom: [-4, 4], restrict: [0, 4], inv: '\\sqrt{x}', oneToOne: false, invTexR: 'x\\ge 0' },
  { id: 'sin', tex: '\\sin x', f: Math.sin, dom: [-4, 4], restrict: [-Math.PI / 2, Math.PI / 2], inv: '\\sin^{-1}x=\\arcsin x', oneToOne: false, invTexR: '-\\frac{\\pi}{2}\\le x\\le\\frac{\\pi}{2}' },
];

function hits(f: Fn, c: number, dom: [number, number]) {
  const n = 2400;
  const xs: number[] = [];
  let px = dom[0];
  let pv = f(px) - c;
  if (Math.abs(pv) < 1e-9) xs.push(px);
  for (let i = 1; i <= n; i++) {
    const x = dom[0] + ((dom[1] - dom[0]) * i) / n;
    const v = f(x) - c;
    if (Math.abs(v) < 1e-9) xs.push(x);
    else if (pv * v < 0 && Math.abs(pv) > 1e-9) {
      let lo = px;
      let hi = x;
      for (let k = 0; k < 40; k++) {
        const m = (lo + hi) / 2;
        if ((f(lo) - c) * (f(m) - c) <= 0) hi = m;
        else lo = m;
      }
      xs.push((lo + hi) / 2);
    }
    px = x;
    pv = v;
  }
  // tangency (e.g. x² = 0, sin x = 1): a local minimum of |f−c| touching zero
  for (let i = 1; i < n; i++) {
    const x = dom[0] + ((dom[1] - dom[0]) * i) / n;
    const h = (dom[1] - dom[0]) / n;
    const a = Math.abs(f(x - h) - c);
    const m = Math.abs(f(x) - c);
    const b = Math.abs(f(x + h) - c);
    if (m < 2e-4 && m <= a && m <= b && !xs.some((q) => Math.abs(q - x) < 0.02)) xs.push(x);
  }
  return xs.filter((x, i) => xs.findIndex((q) => Math.abs(q - x) < 1e-3) === i);
}

export function InverseLab() {
  const [fid, setFid] = useState('sq');
  const [c, setC] = useState(1.5);
  const [restrict, setRestrict] = useState(false);
  const [show, setShow] = useState(true);
  const F = INV.find((i) => i.id === fid)!;
  const dom: [number, number] = restrict && F.restrict ? F.restrict : F.dom;
  const one = F.oneToOne || (restrict && !!F.restrict);
  const pts = hits(F.f, c, dom);
  const fx = useMemo(() => (t: number) => F.f(t), [F]);
  const id = useMemo(() => (t: number) => t, []);
  return (
    <LabShell
      scene={
        <>
          <FitCamera width={6.8} height={6.8} />
          <Plot3D x={[-4, 4]} y={[-4, 4]} width={6.4} height={6.4}>
            <PlotSegment from={[-4, -4]} to={[4, 4]} color="#9fb0c8" dashed />
            <PlotText x={3.4} y={3.8} text="$y=x$" color="#9fb0c8" />
            {restrict && F.restrict && <PlotCurve fn={F.f} color="#7d8ea6" opacity={0.3} radius={0.03} />}
            <PlotCurve fn={F.f} domain={dom} color={ICE} />
            {show && <PlotParam fx={fx} fy={id} t={dom} color={one ? AMBER : BAD} opacity={one ? 1 : 0.55} />}
            <PlotHLine y={c} color={pts.length > 1 ? BAD : GOOD} dashed={false} width={2.5} />
            {pts.map((x, i) => (
              <PlotPoint key={i} x={x} y={c} color={pts.length > 1 ? BAD : GOOD} />
            ))}
          </Plot3D>
        </>
      }
      readout={
        <div className="readout-eq">
          <Tex tex={`f(x)=${F.tex}${restrict && F.invTexR ? `,\\quad ${F.invTexR}` : ''}`} block />
          <p className={`readout-note ${pts.length > 1 ? 'warn' : ''}`}>
            <RichInline text={`الخط الأفقي $y=${tn(c)}$ يقطع المنحنى في **${pts.length}** ${pts.length === 1 ? 'نقطة' : 'نقاط'}${pts.length > 1 ? ' — قيمتان مختلفتان لـ $x$ تعطيان الناتج نفسه.' : '.'}`} />
          </p>
          {one ? (
            <Tex tex={`f^{-1}(x) = ${F.inv}`} block />
          ) : (
            <p className="readout-note warn">
              <RichInline text="الدالة ليست واحدًا لواحد على كل مجالها، فانعكاسها (الأحمر) ليس دالة. فعّل «قيّد المجال» لتصبح قابلة للعكس." />
            </p>
          )}
          <p className="readout-note">
            <RichInline text="منحنى $f^{-1}$ هو انعكاس منحنى $f$ حول المستقيم $y=x$. وتذكّر: $f^{-1}(x)\ne\frac{1}{f(x)}$." />
          </p>
        </div>
      }
      controls={
        <>
          <Choice
            label="الدالة"
            value={fid}
            onChange={(v) => {
              setFid(v);
              setRestrict(false);
            }}
            options={INV.map((i) => ({ value: i.id, label: `$${i.tex}$` }))}
          />
          <Slider label="الخط الأفقي $y=c$" value={c} min={-3.5} max={3.5} step={0.1} onChange={setC} />
          {F.restrict && <Toggle label={`قيّد المجال $${F.invTexR}$`} checked={restrict} onChange={setRestrict} />}
          <Toggle label="أظهر الانعكاس حول $y=x$" checked={show} onChange={setShow} />
        </>
      }
    />
  );
}

/* ───────────────────────── Piecewise ───────────────────────── */

interface Piece {
  tex: string;
  cond: string;
  f: Fn;
  inDom: (x: number) => boolean;
  range: [number, number];
  closedAtBreak: boolean;
}
const PW: Record<string, { label: string; br: number; pieces: [Piece, Piece] }> = {
  ex25: {
    label: 'مثال 25',
    br: -1,
    pieces: [
      { tex: '1-x', cond: 'x\\le -1', f: (x) => 1 - x, inDom: (x) => x <= -1, range: [-10, -1], closedAtBreak: true },
      { tex: 'x^2', cond: 'x>-1', f: (x) => x * x, inDom: (x) => x > -1, range: [-1, 10], closedAtBreak: false },
    ],
  },
  t25: {
    label: 'تمرين 25 (التدريب)',
    br: 0,
    pieces: [
      { tex: 'x+1', cond: 'x<0', f: (x) => x + 1, inDom: (x) => x < 0, range: [-10, 0], closedAtBreak: false },
      { tex: 'x^2', cond: 'x\\ge 0', f: (x) => x * x, inDom: (x) => x >= 0, range: [0, 10], closedAtBreak: true },
    ],
  },
  abs: {
    label: '$|x|$',
    br: 0,
    pieces: [
      { tex: '-x', cond: 'x<0', f: (x) => -x, inDom: (x) => x < 0, range: [-10, 0], closedAtBreak: false },
      { tex: 'x', cond: 'x\\ge 0', f: (x) => x, inDom: (x) => x >= 0, range: [0, 10], closedAtBreak: true },
    ],
  },
};

export function PiecewiseLab() {
  const [pid, setPid] = useState('ex25');
  const [x, setX] = useState(-2);
  const P = PW[pid];
  const active = P.pieces[0].inDom(x) ? 0 : 1;
  const piece = P.pieces[active];
  const y = piece.f(x);
  const brace = `\\begin{cases} ${P.pieces[0].tex} & ${P.pieces[0].cond} \\\\ ${P.pieces[1].tex} & ${P.pieces[1].cond} \\end{cases}`;
  return (
    <LabShell
      scene={
        <>
          <FitCamera width={7.6} height={5.8} />
          <Plot3D x={[-4, 3]} y={[-2, 6]} width={7} height={5.4}>
            {P.pieces.map((pc, i) => (
              <PlotCurve key={i} fn={pc.f} domain={pc.range} color={i === 0 ? ICE : AMBER} opacity={i === active ? 1 : 0.4} />
            ))}
            {P.pieces.map((pc, i) => (
              <PlotPoint key={'b' + i} x={P.br} y={pc.f(P.br)} color={i === 0 ? ICE : AMBER} open={!pc.closedAtBreak} />
            ))}
            <PlotSegment from={[x, 0]} to={[x, y]} color={MINT} dashed />
            <PlotPoint x={x} y={y} color={MINT} label={`$f(${tn(x)})=${fmt(y, 3)}$`} size={1.15} />
          </Plot3D>
        </>
      }
      readout={
        <div className="readout-eq">
          <Tex tex={`f(x)=${brace}`} block />
          <p className="readout-note">
            <RichInline text={`$x=${tn(x)}$ يحقق الشرط $${piece.cond}$، لذلك نستخدم القاعدة $${piece.tex}$:`} />
          </p>
          <Tex tex={`f(${tn(x)}) = ${piece.tex.replace(/x/g, `(${tn(x)})`)} = ${fmt(y, 4)}`} block />
          <p className="readout-note">
            <RichInline text="عند نقطة الانقطاع: الدائرة المُصمتة ● تعني أن هذه القاعدة تشمل النقطة، والمفتوحة ○ تعني أنها لا تشملها." />
          </p>
        </div>
      }
      controls={
        <>
          <Choice label="الدالة" value={pid} onChange={setPid} options={Object.entries(PW).map(([k, v]) => ({ value: k, label: v.label }))} />
          <Slider label="$x$" value={x} min={-4} max={3} step={0.25} onChange={setX} />
          <Row>
            {[-2, -1, 0].map((v) => (
              <Btn key={v} onClick={() => setX(v)}>
                <RichInline text={`$x=${v}$`} />
              </Btn>
            ))}
          </Row>
        </>
      }
    />
  );
}

/* ───────────────────────── Difference quotient ───────────────────────── */

const DQ: Record<string, { tex: string; f: Fn; q: (a: number, h: number) => number; qTex: string; slope: (a: number) => number; slopeTex: string }> = {
  sq: { tex: 'x^2', f: (x) => x * x, q: (a, h) => 2 * a + h, qTex: '2a+h', slope: (a) => 2 * a, slopeTex: '2a' },
  ex5: { tex: '2x^2-5x+1', f: (x) => 2 * x * x - 5 * x + 1, q: (a, h) => 4 * a + 2 * h - 5, qTex: '4a+2h-5', slope: (a) => 4 * a - 5, slopeTex: '4a-5' },
  r22: { tex: 'x^2-x', f: (x) => x * x - x, q: (a, h) => 2 * a + h - 1, qTex: '2a+h-1', slope: (a) => 2 * a - 1, slopeTex: '2a-1' },
};

export function DiffQuotientLab() {
  const [fid, setFid] = useState('sq');
  const [a, setA] = useState(1);
  const [h, setH0] = useState(1.5);
  const anim = useRef<number | null>(null);
  const setH = (v: number) => setH0(Math.abs(v) < 0.02 ? (v < 0 ? -0.02 : 0.02) : v);
  const D = DQ[fid];
  const fa = D.f(a);
  const fah = D.f(a + h);
  const q = (fah - fa) / h;
  const secant = useMemo(() => (x: number) => fa + q * (x - a), [fa, q, a]);
  const tangent = useMemo(() => (x: number) => fa + D.slope(a) * (x - a), [fa, D, a]);
  useEffect(() => () => {
    if (anim.current) cancelAnimationFrame(anim.current);
  }, []);
  const hRef = useRef(h);
  hRef.current = h;
  const shrink = () => {
    if (anim.current) cancelAnimationFrame(anim.current);
    const step = () => {
      const cur = hRef.current;
      const next = cur * 0.94;
      if (Math.abs(next) < 0.02) {
        setH0(cur < 0 ? -0.02 : 0.02);
        anim.current = null;
        return;
      }
      hRef.current = next;
      setH0(next);
      anim.current = requestAnimationFrame(step);
    };
    anim.current = requestAnimationFrame(step);
  };
  return (
    <LabShell
      scene={
        <>
          <FitCamera width={7.6} height={6} />
          <Plot3D x={[-3, 4]} y={[-4, 10]} width={7} height={5.6}>
            <PlotCurve fn={tangent} color="#9fb0c8" opacity={0.35} radius={0.025} />
            <PlotCurve fn={secant} color={AMBER} radius={0.035} />
            <PlotCurve fn={D.f} color={ICE} />
            <PlotSegment from={[a, fa]} to={[a + h, fa]} color={MINT} dashed />
            <PlotSegment from={[a + h, fa]} to={[a + h, fah]} color={MINT} dashed />
            <PlotText x={a + h / 2} y={fa - 0.6} text="$h$" color={MINT} />
            <PlotText x={a + h + 0.8} y={(fa + fah) / 2} text="$\Delta y$" color={MINT} />
            <PlotPoint x={a} y={fa} color="#ffffff" label="$P$" labelOffset={[-0.3, 0.35]} />
            <PlotPoint x={a + h} y={fah} color={AMBER} label="$Q$" />
          </Plot3D>
        </>
      }
      readout={
        <div className="readout-eq">
          <Tex tex={`f(x)=${D.tex}:\\quad \\frac{f(a+h)-f(a)}{h} = ${D.qTex}`} block />
          <Tex tex={`\\frac{f(${tn(a + h)})-f(${tn(a)})}{${tn(h)}} = \\frac{${fmt(fah, 3)}-(${fmt(fa, 3)})}{${tn(h)}} = ${fmt(q, 4)} \\quad\\checkmark\\quad ${D.qTex.replace(/a/g, `(${tn(a)})`).replace(/h/g, `(${tn(h)})`)} = ${fmt(D.q(a, h), 4)}`} block />
          <p className="readout-note">
            <RichInline text={`الخارج = ميل الخط القاطع $PQ$ (متوسط معدل التغير). كلما صغر $h$ اقترب الميل من $${D.slopeTex}=${fmt(D.slope(a), 3)}$ — ميل المماس الرمادي، وهي فكرة **المشتقة** في الفصل الثاني.`} />
          </p>
        </div>
      }
      controls={
        <>
          <Choice
            label="الدالة"
            value={fid}
            onChange={setFid}
            options={[
              { value: 'sq', label: 'مثال 26: $x^2$' },
              { value: 'ex5', label: 'مثال 5: $2x^2-5x+1$' },
              { value: 'r22', label: 'مراجعة 22: $x^2-x$' },
            ]}
          />
          <Slider label="$a$" value={a} min={-2} max={3} step={0.25} onChange={setA} />
          <Slider label="$h$ (لا يساوي صفرًا)" value={h} min={-2} max={2} step={0.02} onChange={setH} />
          <Row>
            <Btn kind="primary" onClick={shrink}>
              اجعل h تقترب من 0
            </Btn>
            <Btn onClick={() => setH0(1.5)}>أعد h = 1.5</Btn>
          </Row>
        </>
      }
    />
  );
}

