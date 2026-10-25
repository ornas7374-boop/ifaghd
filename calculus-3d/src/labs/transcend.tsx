import { Line } from '@react-three/drei';
import { useMemo, useState } from 'react';
import { Btn, Choice, Row, Slider } from '../components/Controls';
import { LabShell } from '../components/LabShell';
import { RichInline, Tex } from '../components/Tex';
import { fmt, tn } from '../lib/text';
import { FitCamera, Hot, Label } from '../three/core';
import { Plot3D, PlotCurve, PlotHLine, PlotPoint, PlotSegment, PlotText, piTicks, type Fn } from '../three/Plot3D';

const ICE = '#8fd3ff';
const AMBER = '#ffb547';
const MINT = '#5ee6b5';

/* ───────────────────────── Exponential functions & e ───────────────────────── */

export function ExpLab() {
  const [mode, setMode] = useState<'graph' | 'e'>('graph');
  const [b, setB] = useState(2);
  const [s, setS] = useState(1);
  const fn = useMemo(() => (x: number) => Math.pow(b, x), [b]);
  const n = Math.round(Math.pow(10, s));
  const en = Math.pow(1 + 1 / n, n);

  if (mode === 'e') {
    return (
      <LabShell
        scene={
          <>
            <FitCamera width={8.2} height={5.4} />
            <Plot3D
              x={[0, 4]}
              y={[1.8, 2.9]}
              width={7.6}
              height={5}
              xLabel="n"
              xTicks={[1, 2, 3, 4].map((k) => ({ v: k, label: k === 4 ? '$10^4$' : String(10 ** k) }))}
              yTicks={[{ v: 2, label: '2' }, { v: 2.5, label: '2.5' }, { v: Math.E, label: '$e$' }]}
            >
              <PlotHLine y={Math.E} color={AMBER} />
              <PlotCurve fn={(t) => Math.pow(1 + Math.pow(10, -t), Math.pow(10, t))} color={ICE} />
              <PlotPoint x={s} y={en} color={MINT} label={`$${fmt(en, 5)}$`} />
            </Plot3D>
          </>
        }
        readout={
          <div className="readout-eq">
            <Tex tex={`\\left(1+\\frac{1}{${n}}\\right)^{${n}} = ${en.toFixed(6)}`} block />
            <Tex tex={`e = 2.718281\\ldots \\qquad \\text{difference} = ${(Math.E - en).toFixed(6)}`} block />
            <p className="readout-note"><RichInline text={'كلما كبر $n$ اقتربت القيمة من $e$ دون أن تتجاوزه. هذا هو تعريف العدد $e$ في الملف.'} /></p>
          </div>
        }
        controls={
          <>
            <Choice label="التجربة" value={mode} onChange={setMode} options={[{ value: 'graph', label: 'الدالة $b^x$' }, { value: 'e', label: 'العدد $e$' }]} />
            <Slider label="$n$ (مقياس لوغاريتمي)" value={s} min={0} max={4} step={0.05} onChange={setS} format={() => `$n=${n}$`} />
          </>
        }
      />
    );
  }

  const near1 = Math.abs(b - 1) < 1e-9;
  return (
    <LabShell
      scene={
        <>
          <FitCamera width={8.2} height={5.8} />
          <Plot3D x={[-4, 4]} y={[-1, 8]} width={7.6} height={5.4}>
            <PlotCurve fn={Math.exp} color="#7d8ea6" opacity={0.4} radius={0.03} />
            <PlotText x={2.3} y={7.4} text="$e^x$" color="#9fb0c8" />
            <PlotCurve fn={fn} color={ICE} />
            <PlotPoint x={0} y={1} color={AMBER} label="$(0,1)$" labelOffset={[-0.55, 0.3]} />
            <PlotPoint x={1} y={b} color={MINT} label={`$(1,${tn(b)})$`} />
            <PlotPoint x={-1} y={1 / b} color={MINT} size={0.8} />
          </Plot3D>
        </>
      }
      readout={
        <div className="readout-eq">
          <Tex tex={`f(x)=${tn(b)}^x:\\quad f(-1)=${fmt(1 / b, 3)},\\ f(0)=1,\\ f(1)=${tn(b)},\\ f(3)=${fmt(b ** 3, 3)}`} block />
          <p className={`readout-note ${near1 ? 'warn' : ''}`}>
            <RichInline
              text={
                near1
                  ? '$b=1$ يعطي خطًا أفقيًا $y=1$؛ لذلك يشترط التعريف $a\\ne1$.'
                  : b > 1
                    ? 'الأساس أكبر من 1: الدالة **متزايدة** (نمو). كل خطوة يمينًا تضرب القيمة في الأساس.'
                    : 'الأساس بين 0 و 1: الدالة **متناقصة** (اضمحلال).'
              }
            />
          </p>
          <p className="readout-note"><RichInline text={'المنحنى لا يلمس محور $x$ أبدًا: المدى $(0,\\infty)$، والمنحنى يمر دائمًا بالنقطة $(0,1)$.'} /></p>
        </div>
      }
      controls={
        <>
          <Choice label="التجربة" value={mode} onChange={setMode} options={[{ value: 'graph', label: 'الدالة $b^x$' }, { value: 'e', label: 'العدد $e$' }]} />
          <Slider label="الأساس $b$" value={b} min={0.2} max={4} step={0.05} onChange={setB} />
          <Row>
            <Btn onClick={() => setB(0.5)}><RichInline text={'$b=\\frac12$'} /></Btn>
            <Btn onClick={() => setB(1)}><RichInline text={'$b=1$'} /></Btn>
            <Btn onClick={() => setB(2)}><RichInline text={'$b=2$'} /></Btn>
            <Btn onClick={() => setB(3)}><RichInline text={'$b=3$'} /></Btn>
          </Row>
        </>
      }
    />
  );
}

/* ───────────────────────── Logarithms ───────────────────────── */

export function LogLab() {
  const [b, setB] = useState(2);
  const [x0, setX0] = useState(4);
  const [y0, setY0] = useState(2);
  const bad = Math.abs(b - 1) < 0.04;
  const L = (v: number) => Math.log(v) / Math.log(b);
  const exp = useMemo(() => (x: number) => Math.pow(b, x), [b]);
  const log = useMemo(() => (x: number) => (x > 0 ? Math.log(x) / Math.log(b) : NaN), [b]);
  const t = L(x0);
  return (
    <LabShell
      scene={
        <>
          <FitCamera width={6.8} height={6.8} />
          <Plot3D x={[-3, 7]} y={[-3, 7]} width={6.4} height={6.4}>
            <PlotSegment from={[-3, -3]} to={[7, 7]} color="#9fb0c8" dashed />
            <PlotText x={6.2} y={6.8} text="$y=x$" color="#9fb0c8" />
            <PlotCurve fn={exp} color={ICE} opacity={0.55} radius={0.04} />
            {!bad && <PlotCurve fn={log} color={AMBER} />}
            {!bad && (
              <>
                <PlotPoint x={x0} y={t} color={AMBER} label={`$(${tn(x0)},\\ ${fmt(t, 3)})$`} />
                <PlotPoint x={t} y={x0} color={ICE} label={`$(${fmt(t, 3)},\\ ${tn(x0)})$`} />
                <PlotSegment from={[x0, t]} to={[t, x0]} color={MINT} dashed />
                <PlotPoint x={1} y={0} color="#ffffff" size={0.7} label="$(1,0)$" labelOffset={[0.45, -0.35]} />
              </>
            )}
          </Plot3D>
        </>
      }
      readout={
        bad ? (
          <p className="readout-note warn"><RichInline text={'لا يوجد لوغاريتم للأساس 1 لأن $1^y=1$ دائمًا. اختر $b\\ne1$.'} /></p>
        ) : (
          <div className="readout-eq">
            <Tex tex={`\\log_{${tn(b)}} ${tn(x0)} = y \\iff ${tn(b)}^{y} = ${tn(x0)} \\quad\\Rightarrow\\quad y = ${fmt(t, 4)}`} block />
            <Tex tex={`\\text{Change of base: } \\frac{\\ln ${tn(x0)}}{\\ln ${tn(b)}} = \\frac{${fmt(Math.log(x0), 4)}}{${fmt(Math.log(b), 4)}} = ${fmt(t, 4)}`} block />
            <Tex tex={`\\log_b(xy)=\\log_b x+\\log_b y:\\quad ${fmt(L(x0 * y0), 4)} = ${fmt(L(x0), 4)} + ${fmt(L(y0), 4)}`} block />
            <p className="readout-note"><RichInline text={'النقطتان على المنحنيين صورتان لبعضهما بالانعكاس حول $y=x$: الإحداثيان يتبادلان.'} /></p>
          </div>
        )
      }
      controls={
        <>
          <Slider label="الأساس $b$" value={b} min={0.25} max={5} step={0.05} onChange={setB} />
          <Row>
            <Btn onClick={() => setB(2)}><RichInline text={'$b=2$'} /></Btn>
            <Btn onClick={() => setB(Math.E)}><RichInline text={'$b=e$ (ln)'} /></Btn>
            <Btn onClick={() => setB(10)}><RichInline text={'$b=10$'} /></Btn>
          </Row>
          <Slider label="$x$" value={x0} min={0.25} max={7} step={0.25} onChange={setX0} />
          <Slider label="$y$ (لقانون الضرب)" value={y0} min={0.25} max={6} step={0.25} onChange={setY0} />
        </>
      }
    />
  );
}

/* ───────────────────────── Trigonometric functions ───────────────────────── */

const EXACT: [number, string][] = [
  [0, '0'], [0.5, '\\tfrac12'], [Math.SQRT2 / 2, '\\tfrac{\\sqrt2}{2}'], [Math.sqrt(3) / 2, '\\tfrac{\\sqrt3}{2}'], [1, '1'],
  [Math.sqrt(3) / 3, '\\tfrac{\\sqrt3}{3}'], [Math.sqrt(3), '\\sqrt3'],
];
function exact(v: number): string | null {
  for (const [n, t] of EXACT) {
    if (Math.abs(Math.abs(v) - n) < 1e-9) return (v < 0 && n !== 0 ? '-' : '') + t;
  }
  return null;
}
const SPECIAL: [number, string][] = [
  [0, '0'], [Math.PI / 6, '\\frac{\\pi}{6}'], [Math.PI / 4, '\\frac{\\pi}{4}'], [Math.PI / 3, '\\frac{\\pi}{3}'],
  [Math.PI / 2, '\\frac{\\pi}{2}'], [(2 * Math.PI) / 3, '\\frac{2\\pi}{3}'], [Math.PI, '\\pi'], [(7 * Math.PI) / 6, '\\frac{7\\pi}{6}'],
  [(3 * Math.PI) / 2, '\\frac{3\\pi}{2}'], [(7 * Math.PI) / 4, '\\frac{7\\pi}{4}'], [2 * Math.PI, '2\\pi'],
];

export function TrigLab() {
  const [th, setTh] = useState(Math.PI / 6);
  const [kind, setKind] = useState<'sin' | 'cos' | 'tan'>('sin');
  const R = 1.6;
  const cx = -4.7;
  const gx = 1.2;
  const s = Math.sin(th);
  const c = Math.cos(th);
  const tanUndef = Math.abs(c) < 1e-9;
  const special = SPECIAL.find(([v]) => Math.abs(v - th) < 1e-9);
  const thTex = special ? special[1] : tn(th, 3);
  const vTex = (v: number) => (special ? exact(v) ?? fmt(v, 4) : fmt(v, 4));
  const f: Fn = kind === 'sin' ? Math.sin : kind === 'cos' ? Math.cos : Math.tan;
  const yv = kind === 'tan' ? (tanUndef ? NaN : s / c) : f(th);
  const W = 7.4;
  const sx = W / (2 * Math.PI);
  const graphPt: [number, number, number] = [gx - W / 2 + th * sx, (Number.isFinite(yv) ? Math.max(-2, Math.min(2, yv)) : 0) * R, 0];
  const P: [number, number, number] = [cx + R * c, R * s, 0];
  return (
    <LabShell
      scene={
        <>
          <FitCamera width={13.4} height={7} center={[-1.4, 0, 0]} />
          {/* unit circle */}
          <group>
            <Hot info={{ title: 'دائرة الوحدة', body: 'دائرة نصف قطرها 1. النقطة على الدائرة عند الزاوية $\\theta$ إحداثياتها $(\\cos\\theta,\\ \\sin\\theta)$: الأفقي = جيب التمام، الرأسي = الجيب.' }}>
              <mesh position={[cx, 0, 0]}>
                <torusGeometry args={[R, 0.025, 12, 120]} />
                <meshStandardMaterial color="#cfdcee" emissive="#cfdcee" emissiveIntensity={0.3} />
              </mesh>
            </Hot>
            <Line points={[[cx - R - 0.4, 0, 0], [cx + R + 0.4, 0, 0]]} color="#7d8ea6" lineWidth={1} />
            <Line points={[[cx, -R - 0.4, 0], [cx, R + 0.4, 0]]} color="#7d8ea6" lineWidth={1} />
            <Line points={[[cx, 0, 0], P]} color="#ffffff" lineWidth={2} />
            <Line points={[P, [P[0], 0, 0]]} color={AMBER} lineWidth={3} />
            <Line points={[[cx, 0, 0], [P[0], 0, 0]]} color={ICE} lineWidth={3} />
            <mesh position={P}>
              <sphereGeometry args={[0.11, 20, 20]} />
              <meshStandardMaterial color={MINT} emissive={MINT} emissiveIntensity={0.8} toneMapped={false} />
            </mesh>
            <Label position={[P[0] + 0.15, P[1] / 2, 0]} text="$\sin\theta$" color={AMBER} size="s" />
            <Label position={[(cx + P[0]) / 2, -0.28, 0]} text="$\cos\theta$" color={ICE} size="s" />
            <Label position={[cx, -R - 0.7, 0]} text={`$\\theta=${thTex}$`} size="s" />
          </group>
          {/* graph */}
          <group position={[gx, 0, 0]}>
            <Plot3D x={[0, 2 * Math.PI]} y={[-2, 2]} width={W} height={4 * R} xLabel="\theta" xTicks={piTicks(0, 2 * Math.PI)} yTicks={[{ v: 1, label: '1' }, { v: -1, label: '−1' }]}>
              <PlotCurve fn={f} color={kind === 'sin' ? AMBER : kind === 'cos' ? ICE : MINT} samples={700} />
            </Plot3D>
          </group>
          {Number.isFinite(yv) && Math.abs(yv) <= 2 && (
            <>
              <mesh position={graphPt}>
                <sphereGeometry args={[0.11, 20, 20]} />
                <meshStandardMaterial color={MINT} emissive={MINT} emissiveIntensity={0.8} toneMapped={false} />
              </mesh>
              {kind === 'sin' && <Line points={[P, graphPt]} color={MINT} lineWidth={1.2} dashed dashSize={0.12} gapSize={0.08} />}
            </>
          )}
        </>
      }
      readout={
        <div className="readout-eq">
          <Tex tex={`\\theta = ${thTex}\\,\\text{ rad} = ${fmt((th * 180) / Math.PI, 1)}^\\circ`} block />
          <Tex
            tex={`\\sin\\theta=${vTex(s)},\\quad \\cos\\theta=${vTex(c)},\\quad \\tan\\theta=${tanUndef ? '\\text{undefined}' : vTex(s / c)}`}
            block
          />
          <Tex tex={`\\sin^2\\theta+\\cos^2\\theta = ${fmt(s * s, 4)} + ${fmt(c * c, 4)} = 1`} block />
          {tanUndef && <p className="readout-note warn"><RichInline text={'$\\tan\\theta=\\frac{\\sin\\theta}{\\cos\\theta}$ غير معرّف هنا لأن $\\cos\\theta=0$.'} /></p>}
        </div>
      }
      controls={
        <>
          <Choice
            label="المنحنى"
            value={kind}
            onChange={setKind}
            options={[
              { value: 'sin', label: '$\\sin x$' },
              { value: 'cos', label: '$\\cos x$' },
              { value: 'tan', label: '$\\tan x$' },
            ]}
          />
          <Slider label="الزاوية $\theta$ (راديان)" value={th} min={0} max={2 * Math.PI} step={0.01} onChange={setTh} format={() => `$${thTex}$`} />
          <div className="ctl">
            <div className="ctl-label">زوايا خاصة من جدول الملف:</div>
            <Row>
              {SPECIAL.map(([v, t]) => (
                <Btn key={t} onClick={() => setTh(v)}>
                  <RichInline text={`$${t}$`} />
                </Btn>
              ))}
            </Row>
          </div>
        </>
      }
    />
  );
}

