import { Line } from '@react-three/drei';
import { useMemo, useState } from 'react';
import { Choice, Slider, Toggle } from '../components/Controls';
import { LabShell } from '../components/LabShell';
import { RichInline, Tex } from '../components/Tex';
import { builderTex, ineqTex, intersect, ivTex, mergeAll, setTex, union, type Iv } from '../lib/intervals';
import { fmt, frac, tn } from '../lib/text';
import { FitCamera, Label } from '../three/core';
import { NLInterval, NLPoint, NumberLine3D, useNL } from '../three/NumberLine3D';
import {
  Plot3D,
  PlotAxisBand,
  PlotCurve,
  PlotHLine,
  PlotPoint,
  PlotRegion,
  PlotText,
  PlotVLine,
} from '../three/Plot3D';

const ICE = '#8fd3ff';
const AMBER = '#ffb547';
const GOOD = '#5fe3a1';
const BAD = '#ff6b7a';

/* ───────────────────────── 1.3 Real line & order ───────────────────────── */

function Connector({ from, to, y0, y1, color }: { from: number; to: number; y0: number; y1: number; color: string }) {
  const { X } = useNL();
  return <Line points={[[X(from), y0, 0], [X(to), y1, 0]]} color={color} lineWidth={1.5} dashed dashSize={0.12} gapSize={0.08} />;
}

const rel = (p: number, q: number) => (Math.abs(p - q) < 1e-9 ? '=' : p < q ? '<' : '>');

export function OrderLab() {
  const [mode, setMode] = useState<'add' | 'mul' | 'recip'>('mul');
  const [a, setA] = useState(-1);
  const [b, setB] = useState(3);
  const [c, setC] = useState(-2);
  const range: [number, number] = mode === 'mul' ? [-12, 12] : mode === 'add' ? [-9, 9] : [-1, 5];
  const step = mode === 'mul' ? 2 : 1;
  const ap = mode === 'add' ? a + c : mode === 'mul' ? a * c : 1 / a;
  const bp = mode === 'add' ? b + c : mode === 'mul' ? b * c : 1 / b;
  const recipOk = mode !== 'recip' || (a > 0 && b > 0);
  const before = rel(a, b);
  const after = rel(ap, bp);
  const flipped = before !== '=' && after !== '=' && before !== after;
  const opTex = mode === 'add' ? `+(${tn(c)})` : mode === 'mul' ? `\\times(${tn(c)})` : '';
  return (
    <LabShell
      scene={
        <>
          <FitCamera width={11} height={4.8} />
          <NumberLine3D range={range} width={10} step={step} y={-1.1}>
            <NLPoint x={a} color={ICE} label={`$a=${tn(a)}$`} />
            <NLPoint x={b} color={AMBER} label={`$b=${tn(b)}$`} />
          </NumberLine3D>
          {recipOk && (
            <NumberLine3D range={range} width={10} step={step} y={1.4}>
              <NLPoint x={ap} color={ICE} label={mode === 'recip' ? `$\\frac1a=${fmt(ap)}$` : `$a${opTex}=${fmt(ap)}$`} />
              <NLPoint x={bp} color={AMBER} label={mode === 'recip' ? `$\\frac1b=${fmt(bp)}$` : `$b${opTex}=${fmt(bp)}$`} />
              <Connector from={a} to={ap} y0={-2.5} y1={0} color={ICE} />
              <Connector from={b} to={bp} y0={-2.5} y1={0} color={AMBER} />
            </NumberLine3D>
          )}
          <Label position={[-5.8, -1.1, 0]} text="قبل" size="s" />
          <Label position={[-5.8, 1.4, 0]} text="بعد" size="s" />
        </>
      }
      readout={
        <div className="readout-eq">
          {recipOk ? (
            <>
              <Tex tex={`a ${before} b \\quad\\Longrightarrow\\quad ${mode === 'recip' ? '\\tfrac1a' : `a${opTex}`} \\quad ${after} \\quad ${mode === 'recip' ? '\\tfrac1b' : `b${opTex}`}`} block />
              <p className={`readout-note ${flipped ? 'warn' : ''}`}>
                <RichInline text={flipped
                  ? mode === 'mul'
                    ? 'انعكست المتباينة! الضرب في عدد سالب يقلب ترتيب النقطتين حول الصفر.'
                    : 'انعكست المتباينة! للأعداد الموجبة: الأكبر مقلوبه أصغر.'
                  : mode === 'add'
                    ? 'الجمع يُزيح النقطتين معًا بالمقدار نفسه، فيبقى الترتيب كما هو.'
                    : mode === 'mul' && c === 0
                      ? 'الضرب في صفر يجعل العددين متساويين: $0=0$.'
                      : 'الضرب في عدد موجب يمدّ المسافات أو يضغطها لكنه يحافظ على الترتيب.'} />
              </p>
            </>
          ) : (
            <p className="readout-note warn">
              <RichInline text="خاصية المقلوب في الملف مشروطة بـ $0<a<b$: اختر قيمًا موجبة." />
            </p>
          )}
        </div>
      }
      controls={
        <>
          <Choice
            label="العملية على الطرفين"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'add', label: 'جمع $c$' },
              { value: 'mul', label: 'ضرب في $c$' },
              { value: 'recip', label: 'المقلوب $\\frac1x$' },
            ]}
          />
          <Slider label="$a$" value={a} min={mode === 'recip' ? 0.5 : -5} max={5} step={0.5} onChange={setA} />
          <Slider label="$b$" value={b} min={mode === 'recip' ? 0.5 : -5} max={5} step={0.5} onChange={setB} />
          {mode !== 'recip' && <Slider label="$c$" value={c} min={-3} max={3} step={0.5} onChange={setC} />}
        </>
      }
    />
  );
}

/* ───────────────────────── 1.4 Intervals ───────────────────────── */

function IvControls({ name, iv, set, color }: { name: string; iv: Iv; set: (i: Iv) => void; color: string }) {
  const loInf = iv.lo === -Infinity;
  const hiInf = iv.hi === Infinity;
  return (
    <fieldset className="ctl-group" style={{ borderColor: color }}>
      <legend style={{ color }}>
        <RichInline text={`المجموعة $${name}=${ivTex(iv)}$`} />
      </legend>
      <Toggle label="الطرف الأيسر $-\infty$" checked={loInf} onChange={(on) => set({ ...iv, lo: on ? -Infinity : Math.min(-2, iv.hi), loC: on ? false : iv.loC })} />
      {!loInf && (
        <>
          <Slider label="الطرف الأيسر" value={iv.lo} min={-8} max={8} step={0.5} onChange={(lo) => set({ ...iv, lo: Math.min(lo, iv.hi) })} />
          <Toggle label="يشمل الطرف الأيسر ( [ )" checked={iv.loC} onChange={(loC) => set({ ...iv, loC })} />
        </>
      )}
      <Toggle label="الطرف الأيمن $+\infty$" checked={hiInf} onChange={(on) => set({ ...iv, hi: on ? Infinity : Math.max(2, iv.lo), hiC: on ? false : iv.hiC })} />
      {!hiInf && (
        <>
          <Slider label="الطرف الأيمن" value={iv.hi} min={-8} max={8} step={0.5} onChange={(hi) => set({ ...iv, hi: Math.max(hi, iv.lo) })} />
          <Toggle label="يشمل الطرف الأيمن ( ] )" checked={iv.hiC} onChange={(hiC) => set({ ...iv, hiC })} />
        </>
      )}
    </fieldset>
  );
}

export function IntervalsLab() {
  const [A, setA] = useState<Iv>({ lo: -3, hi: 4, loC: true, hiC: false });
  const [B, setB] = useState<Iv>({ lo: 0, hi: 6, loC: false, hiC: true });
  const [op, setOp] = useState<'A' | 'and' | 'or'>('and');
  const res = op === 'A' ? [A] : op === 'and' ? intersect(A, B) : union(A, B);
  return (
    <LabShell
      scene={
        <>
          <FitCamera width={11} height={4.4} center={[0, 0.7, 0]} />
          <NumberLine3D range={[-8, 8]} width={10} step={1} labelEvery={2}>
            <NLInterval from={A.lo} to={A.hi} closedFrom={A.loC} closedTo={A.hiC} color={ICE} lift={op === 'A' ? 0 : 1.1} label={op === 'A' ? undefined : '$A$'} />
            {op !== 'A' && <NLInterval from={B.lo} to={B.hi} closedFrom={B.loC} closedTo={B.hiC} color={AMBER} lift={2.1} label="$B$" />}
            {op !== 'A' &&
              res.map((r, i) => (
                <NLInterval key={i} from={r.lo} to={r.hi} closedFrom={r.loC} closedTo={r.hiC} color={GOOD} lift={0} radius={0.09} />
              ))}
          </NumberLine3D>
          {op !== 'A' && <Label position={[-6.2, 0.3, 0]} text={op === 'and' ? '$A\\cap B$' : '$A\\cup B$'} color={GOOD} size="s" />}
        </>
      }
      readout={
        <div className="readout-eq">
          {op === 'A' ? (
            <>
              <Tex tex={`A = ${ivTex(A)} = ${builderTex(A)}`} block />
              <p className="readout-note">
                <RichInline text={`بالكلمات: كل الأعداد $x$ التي تحقق $${ineqTex(A)}$.`} />
              </p>
            </>
          ) : (
            <>
              <Tex tex={`A=${ivTex(A)},\\quad B=${ivTex(B)}`} block />
              <Tex tex={`${op === 'and' ? 'A\\cap B' : 'A\\cup B'} = ${setTex(res)}`} block />
              <p className="readout-note">
                {op === 'and' ? 'التقاطع ∩ = الأعداد الموجودة في المجموعتين معًا (حيث يتداخل اللونان).' : 'الاتحاد ∪ = الأعداد الموجودة في إحدى المجموعتين على الأقل.'}
              </p>
            </>
          )}
        </div>
      }
      controls={
        <>
          <Choice
            label="ماذا نعرض؟"
            value={op}
            onChange={setOp}
            options={[
              { value: 'A', label: 'فترة واحدة' },
              { value: 'and', label: 'التقاطع $A\\cap B$' },
              { value: 'or', label: 'الاتحاد $A\\cup B$' },
            ]}
          />
          <IvControls name="A" iv={A} set={setA} color={ICE} />
          {op !== 'A' && <IvControls name="B" iv={B} set={setB} color={AMBER} />}
        </>
      }
    />
  );
}

/* ───────────────────────── 1.5 Linear inequalities ───────────────────────── */

type Op = '<' | '\\le' | '>' | '\\ge';
const OPS: { value: Op; label: string }[] = [
  { value: '<', label: '$<$' },
  { value: '\\le', label: '$\\le$' },
  { value: '>', label: '$>$' },
  { value: '\\ge', label: '$\\ge$' },
];
const flip = (o: Op): Op => (o === '<' ? '>' : o === '>' ? '<' : o === '\\le' ? '\\ge' : '\\le');
const test = (o: Op, l: number, r: number) => (o === '<' ? l < r : o === '\\le' ? l <= r : o === '>' ? l > r : l >= r);

export function LinearIneqLab() {
  const [a, setA0] = useState(3);
  const [b, setB] = useState(-5);
  const [c, setC] = useState(7);
  const [op, setOp] = useState<Op>('<');
  const setA = (v: number) => setA0(v === 0 ? 0.5 : v);
  const x0 = (c - b) / a;
  const finalOp = a < 0 ? flip(op) : op;
  const sol: Iv =
    finalOp === '<' || finalOp === '\\le'
      ? { lo: -Infinity, hi: x0, loC: false, hiC: finalOp === '\\le' }
      : { lo: x0, hi: Infinity, loC: finalOp === '\\ge', hiC: false };
  const fn = useMemo(() => (x: number) => a * x + b, [a, b]);
  const colorAt = useMemo(() => (x: number) => (test(op, a * x + b, c) ? GOOD : BAD), [a, b, c, op]);
  const bTex = b === 0 ? '' : b > 0 ? `+${tn(b)}` : `-${tn(-b)}`;
  return (
    <LabShell
      scene={
        <>
          <FitCamera width={8.4} height={5.6} />
          <Plot3D x={[-8, 8]} y={[-12, 12]} width={8} height={5.2}>
            <PlotRegion from={sol.lo} to={sol.hi} color={GOOD} />
            <PlotHLine y={c} color={AMBER} />
            <PlotText x={-7} y={c + 1.4} text={`$y=${tn(c)}$`} color={AMBER} />
            <PlotCurve fn={fn} color={ICE} colorAt={colorAt} />
            <PlotPoint x={x0} y={c} color="#ffffff" open={!(op === '\\le' || op === '\\ge')} label={`$x=${frac(x0)}$`} />
            <PlotAxisBand from={sol.lo} to={sol.hi} closedFrom={sol.loC} closedTo={sol.hiC} color={GOOD} />
          </Plot3D>
        </>
      }
      readout={
        <div className="readout-eq steps">
          <Tex tex={`${tn(a)}x ${bTex} ${op} ${tn(c)}`} block />
          <Tex tex={`${tn(a)}x ${op} ${tn(c)} ${b >= 0 ? '-' : '+'} ${tn(Math.abs(b))} = ${tn(c - b)}`} block />
          <Tex tex={`x ${finalOp} \\dfrac{${tn(c - b)}}{${tn(a)}} = ${frac(x0)}`} block />
          {a < 0 && <p className="readout-note warn">قسمنا على عدد سالب ({fmt(a)}) فانقلبت إشارة المتباينة.</p>}
          <p className="readout-note">
            <RichInline text={`مجموعة الحل: $${ivTex(sol)}$ — الجزء الأخضر من المستقيم هو حيث تتحقق المتباينة.`} />
          </p>
        </div>
      }
      controls={
        <>
          <Slider label="معامل $x$ ($a$)" value={a} min={-4} max={4} step={0.5} onChange={setA} />
          <Slider label="الثابت $b$" value={b} min={-8} max={8} step={1} onChange={setB} />
          <Choice label="الإشارة" value={op} onChange={setOp} options={OPS} />
          <Slider label="الطرف الأيمن $c$" value={c} min={-10} max={10} step={1} onChange={setC} />
        </>
      }
    />
  );
}

/* ───────────────────────── 1.5 Sign diagrams ───────────────────────── */

export function SignLab() {
  const [kind, setKind] = useState<'quad' | 'cubic' | 'rat'>('quad');
  const [r1, setR1] = useState(-2);
  const [r2, setR2] = useState(3);
  const [r3, setR3] = useState(0);
  const [neg, setNeg] = useState(false);
  const [op, setOp] = useState<Op>('>');
  const k = neg ? -1 : 1;
  const fn = useMemo(() => {
    if (kind === 'quad') return (x: number) => k * (x - r1) * (x - r2);
    if (kind === 'cubic') return (x: number) => (k * (x - r1) * (x - r2) * (x - r3)) / 2;
    return (x: number) => (k * (x - r1)) / (x - r2);
  }, [kind, r1, r2, r3, k]);

  const numRoots = kind === 'quad' ? [r1, r2] : kind === 'cubic' ? [r1, r2, r3] : [r1];
  const denRoots = kind === 'rat' ? [r2] : [];
  const crit = [...new Set([...numRoots, ...denRoots])].sort((p, q) => p - q);
  const strict = op === '<' || op === '>';
  const wantPos = op === '>' || op === '\\ge';

  const { sol, signs } = useMemo(() => {
    const pts = [-Infinity, ...crit, Infinity];
    const list: Iv[] = [];
    const sg: { x: number; s: '+' | '-' }[] = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const lo = pts[i];
      const hi = pts[i + 1];
      const mid = !Number.isFinite(lo) ? hi - 1 : !Number.isFinite(hi) ? lo + 1 : (lo + hi) / 2;
      if (lo === hi) continue;
      const val = fn(mid);
      sg.push({ x: Math.max(-5.5, Math.min(5.5, mid)), s: val > 0 ? '+' : '-' });
      if ((val > 0) === wantPos) list.push({ lo, hi, loC: false, hiC: false });
    }
    if (!strict) for (const r of numRoots) if (!denRoots.includes(r)) list.push({ lo: r, hi: r, loC: true, hiC: true });
    return { sol: mergeAll(list), signs: sg };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fn, crit.join(','), op]);

  const colorAt = useMemo(() => (_: number, y: number) => (y >= 0 ? GOOD : BAD), []);
  const f = (r: number) => (r === 0 ? 'x' : r > 0 ? `(x-${tn(r)})` : `(x+${tn(-r)})`);
  const lead = neg ? '-' : '';
  const exprTex =
    kind === 'quad' ? `${lead}${f(r1)}${f(r2)}` : kind === 'cubic' ? `${lead}\\tfrac12${f(r1)}${f(r2)}${f(r3)}` : `\\dfrac{${lead}${f(r1).replace(/^\(|\)$/g, '')}}{${f(r2).replace(/^\(|\)$/g, '')}}`;
  return (
    <LabShell
      scene={
        <>
          <FitCamera width={8.4} height={5.8} />
          <Plot3D x={[-6, 6]} y={[-8, 8]} width={8} height={5.4}>
            {sol.map((s, i) => (
              <PlotRegion key={i} from={s.lo} to={s.hi} color={GOOD} opacity={0.1} />
            ))}
            <PlotCurve fn={fn} color={ICE} colorAt={colorAt} />
            {denRoots.map((d) => (
              <PlotVLine key={'d' + d} x={d} color={BAD} />
            ))}
            {numRoots.map((r, i) => (
              <PlotPoint key={'r' + i} x={r} y={0} color="#ffffff" open={strict} />
            ))}
            {signs.map((s, i) => (
              <PlotText key={'s' + i} x={s.x} y={6.6} text={s.s === '+' ? '+' : '−'} color={s.s === '+' ? GOOD : BAD} size="l" />
            ))}
            {sol.map((s, i) => (
              <PlotAxisBand key={'b' + i} from={s.lo} to={s.hi} closedFrom={s.loC} closedTo={s.hiC} color={GOOD} />
            ))}
          </Plot3D>
        </>
      }
      readout={
        <div className="readout-eq">
          <Tex tex={`${exprTex} \\quad ${op} \\quad 0`} block />
          <p className="readout-note">
            <RichInline text={`الأعداد الحرجة: $${crit.map(frac).join(',\\ ')}$. المنحنى أخضر حيث القيمة موجبة وأحمر حيث سالبة.`} />
          </p>
          <Tex tex={`\\text{Solution: } ${setTex(sol)}`} block />
          {denRoots.length > 0 && <p className="readout-note warn">صفر المقام مستبعد دائمًا (الخط الأحمر المتقطع): القسمة على صفر غير معرّفة.</p>}
        </div>
      }
      controls={
        <>
          <Choice
            label="نوع العبارة"
            value={kind}
            onChange={setKind}
            options={[
              { value: 'quad', label: 'تربيعية' },
              { value: 'cubic', label: 'تكعيبية' },
              { value: 'rat', label: 'كسرية' },
            ]}
          />
          <Slider label={kind === 'rat' ? 'صفر البسط' : 'الجذر الأول'} value={r1} min={-5} max={5} step={0.5} onChange={setR1} />
          <Slider label={kind === 'rat' ? 'صفر المقام' : 'الجذر الثاني'} value={r2} min={-5} max={5} step={0.5} onChange={setR2} />
          {kind === 'cubic' && <Slider label="الجذر الثالث" value={r3} min={-5} max={5} step={0.5} onChange={setR3} />}
          <Choice label="المتباينة" value={op} onChange={setOp} options={OPS} />
          <Toggle label="اضرب العبارة في $-1$" checked={neg} onChange={setNeg} />
        </>
      }
    />
  );
}

/* ───────────────────────── 1.6 Absolute value ───────────────────────── */

type AOp = '=' | '<' | '\\le' | '>' | '\\ge';

export function solveAbs(m: number, b: number, r: number, op: AOp): Iv[] {
  const c = -b / m;
  if (r < 0) return op === '>' || op === '\\ge' ? [{ lo: -Infinity, hi: Infinity, loC: false, hiC: false }] : [];
  if (r === 0) {
    if (op === '=' || op === '\\le') return [{ lo: c, hi: c, loC: true, hiC: true }];
    if (op === '<') return [];
    if (op === '\\ge') return [{ lo: -Infinity, hi: Infinity, loC: false, hiC: false }];
    return [
      { lo: -Infinity, hi: c, loC: false, hiC: false },
      { lo: c, hi: Infinity, loC: false, hiC: false },
    ];
  }
  const h = r / Math.abs(m);
  if (op === '=') return [{ lo: c - h, hi: c - h, loC: true, hiC: true }, { lo: c + h, hi: c + h, loC: true, hiC: true }];
  if (op === '<' || op === '\\le') return [{ lo: c - h, hi: c + h, loC: op === '\\le', hiC: op === '\\le' }];
  return [
    { lo: -Infinity, hi: c - h, loC: false, hiC: op === '\\ge' },
    { lo: c + h, hi: Infinity, loC: op === '\\ge', hiC: false },
  ];
}

export function AbsLab() {
  const [m, setM0] = useState(2);
  const [b, setB] = useState(-1);
  const [r, setR] = useState(5);
  const [op, setOp] = useState<AOp>('=');
  const setM = (v: number) => setM0(v === 0 ? 0.5 : v);
  const fn = useMemo(() => (x: number) => Math.abs(m * x + b), [m, b]);
  const sol = solveAbs(m, b, r, op);
  const c = -b / m;
  const h = r / Math.abs(m);
  const inner = `${tn(m) === '1' ? '' : tn(m) === '-1' ? '-' : tn(m)}x${b === 0 ? '' : b > 0 ? '+' + tn(b) : '-' + tn(-b)}`;
  const solText =
    op === '='
      ? sol.length
        ? `x \\in \\{${sol.map((s) => frac(s.lo)).join(',\\ ')}\\}`
        : '\\varnothing'
      : setTex(sol);
  return (
    <LabShell
      scene={
        <>
          <FitCamera width={8.4} height={5.6} />
          <Plot3D x={[-8, 8]} y={[-3, 12]} width={8} height={5.2}>
            {op !== '=' && sol.map((s, i) => <PlotRegion key={i} from={s.lo} to={s.hi} color={GOOD} opacity={0.1} />)}
            <PlotHLine y={r} color={AMBER} />
            <PlotText x={-6.8} y={r + 0.8} text={`$y=${tn(r)}$`} color={AMBER} />
            <PlotCurve fn={fn} color={ICE} />
            <PlotPoint x={c} y={0} color={ICE} label={`$${frac(c)}$`} labelOffset={[0, -0.45]} size={0.8} />
            {r > 0 && (
              <>
                <PlotPoint x={c - h} y={r} color="#ffffff" open={op === '<' || op === '>'} />
                <PlotPoint x={c + h} y={r} color="#ffffff" open={op === '<' || op === '>'} />
              </>
            )}
            {sol.map((s, i) => (
              <PlotAxisBand key={i} from={s.lo} to={s.hi} closedFrom={s.loC} closedTo={s.hiC} color={GOOD} />
            ))}
          </Plot3D>
        </>
      }
      readout={
        <div className="readout-eq">
          <Tex tex={`|${inner}| \\quad ${op} \\quad ${tn(r)}`} block />
          {r > 0 ? (
            <p className="readout-note">
              <RichInline
                text={`بالمسافة: $|x-(${frac(c)})| ${op} ${frac(h)}$، أي المسافة بين $x$ والعدد $${frac(c)}$ ${op === '=' ? 'تساوي' : op === '<' || op === '\\le' ? 'أصغر من' : 'أكبر من'} $${frac(h)}$.`}
              />
            </p>
          ) : (
            <p className="readout-note warn">
              <RichInline text={r < 0 ? 'القيمة المطلقة لا تكون سالبة أبدًا: $|\\ldots|\\ge 0$ دائمًا.' : 'الطرف الأيمن صفر: $|\\ldots|=0$ فقط عندما يكون ما بداخلها صفرًا.'} />
            </p>
          )}
          <Tex tex={`\\text{Solution: } ${solText}`} block />
        </div>
      }
      controls={
        <>
          <Slider label="معامل $x$ داخل القيمة المطلقة" value={m} min={-3} max={3} step={0.5} onChange={setM} />
          <Slider label="الثابت داخلها" value={b} min={-6} max={6} step={1} onChange={setB} />
          <Choice
            label="الإشارة"
            value={op}
            onChange={setOp}
            options={[{ value: '=' as AOp, label: '$=$' }, ...(OPS as { value: AOp; label: string }[])]}
          />
          <Slider label="الطرف الأيمن" value={r} min={-2} max={10} step={1} onChange={setR} />
        </>
      }
    />
  );
}

