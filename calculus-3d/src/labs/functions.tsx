import { RoundedBox } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Choice, Slider } from '../components/Controls';
import { LabShell } from '../components/LabShell';
import { RichInline, Tex } from '../components/Tex';
import { setTex, type Iv } from '../lib/intervals';
import { fmt, tn } from '../lib/text';
import { FitCamera, Hot, Label, type InfoCard } from '../three/core';
import {
  Plot3D,
  PlotAxisBand,
  PlotCurve,
  PlotParam,
  PlotPoint,
  PlotSegment,
  PlotText,
  PlotVLine,
  type Fn,
} from '../three/Plot3D';

const ICE = '#8fd3ff';
const AMBER = '#ffb547';
const GOOD = '#5fe3a1';
const BAD = '#ff6b7a';
const MINT = '#5ee6b5';

/* ───────────────────────── function machines ───────────────────────── */

function Machine({ x, tex, color, error, info }: { x: number; tex: string; color: string; error: boolean; info: InfoCard }) {
  const body = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!body.current) return;
    const m = body.current.material as THREE.MeshStandardMaterial;
    m.emissiveIntensity = error ? 0.5 + Math.sin(clock.elapsedTime * 8) * 0.3 : 0.18;
  });
  const c = error ? BAD : color;
  return (
    <Hot info={info}>
      <group position={[x, 0, 0]}>
        <RoundedBox ref={body} args={[1.9, 1.4, 1.1]} radius={0.16} smoothness={4}>
          <meshStandardMaterial color={c} emissive={c} emissiveIntensity={0.2} roughness={0.35} metalness={0.35} />
        </RoundedBox>
        <mesh position={[-1.2, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <cylinderGeometry args={[0.42, 0.18, 0.5, 24, 1, true]} />
          <meshStandardMaterial color="#cfdcee" metalness={0.6} roughness={0.3} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[1.15, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.18, 0.18, 0.45, 20]} />
          <meshStandardMaterial color="#cfdcee" metalness={0.6} roughness={0.3} />
        </mesh>
        <Label position={[0, 0, 0.62]} text={`$${tex}$`} size="m" className="lbl-machine" />
      </group>
    </Hot>
  );
}

/** Balls at fixed stations plus a spark that travels the chain whenever the input changes. */
function Chain({
  stages,
  values,
  runKey,
}: {
  stages: { tex: string; color: string; info: InfoCard }[];
  values: { tex: string; ok: boolean }[];
  runKey: string;
}) {
  const gap = 3.4;
  const n = stages.length;
  const ballX = Array.from({ length: n + 1 }, (_, i) => -((n * gap) / 2) + i * gap);
  const machineX = Array.from({ length: n }, (_, i) => ballX[i] + gap / 2);
  const spark = useRef<THREE.Mesh>(null);
  const p = useRef(0);
  const balls = useRef<(THREE.Group | null)[]>([]);
  useEffect(() => {
    p.current = 0;
  }, [runKey]);
  const firstError = values.findIndex((v) => !v.ok);
  const stop = firstError === -1 ? n : firstError; // spark stops at the failing machine
  useFrame((_, dt) => {
    p.current = Math.min(p.current + dt * 0.9, n + 0.3);
    const seg = Math.min(p.current, stop === n ? n : stop - 0.5);
    const xPos = ballX[0] + seg * gap;
    if (spark.current) {
      spark.current.position.set(xPos, 0.15 * Math.sin(p.current * Math.PI * 2), 0.3);
      spark.current.visible = p.current < n + 0.25;
    }
    balls.current.forEach((g, i) => {
      if (!g) return;
      const target = i === 0 || p.current >= i ? 1 : 0.001;
      const s = g.scale.x + (target - g.scale.x) * Math.min(1, dt * 7);
      g.scale.setScalar(s);
    });
  });
  return (
    <group>
      {stages.map((s, i) => (
        <Machine key={i} x={machineX[i]} tex={s.tex} color={s.color} error={firstError === i + 1} info={s.info} />
      ))}
      {values.map((v, i) => {
        const dim = firstError !== -1 && i > firstError;
        return (
          <group key={i} position={[ballX[i], 0, 0]} ref={(el) => (balls.current[i] = el)}>
            <mesh>
              <sphereGeometry args={[0.3, 28, 28]} />
              <meshStandardMaterial
                color={v.ok ? (i === 0 ? AMBER : i === n ? MINT : ICE) : BAD}
                emissive={v.ok ? (i === 0 ? AMBER : i === n ? MINT : ICE) : BAD}
                emissiveIntensity={0.55}
                transparent
                opacity={dim ? 0.25 : 1}
                toneMapped={false}
              />
            </mesh>
            <Label position={[0, -0.72, 0]} text={v.tex} size="s" color={v.ok ? undefined : BAD} />
          </group>
        );
      })}
      <mesh ref={spark}>
        <sphereGeometry args={[0.09, 12, 12]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}

interface FnDef {
  id: string;
  tex: string; // right-hand side
  name: string;
  f: Fn;
  dom: Iv[];
  domTex: string;
  range: Iv[];
  why: string;
}

const EX20: FnDef[] = [
  {
    id: 'sqrt', name: 'f', tex: '\\sqrt{x-2}', f: (x) => (x >= 2 ? Math.sqrt(x - 2) : NaN),
    dom: [{ lo: 2, hi: Infinity, loC: true, hiC: false }], domTex: 'x-2\\ge 0', range: [{ lo: 0, hi: Infinity, loC: true, hiC: false }],
    why: 'ما تحت الجذر التربيعي يجب ألا يكون سالبًا: $x-2\\ge0$. والجذر نفسه لا يعطي إلا قيمًا $\\ge 0$.',
  },
  {
    id: 'recip', name: 'g', tex: '\\dfrac{1}{x+3}', f: (x) => 1 / (x + 3),
    dom: [{ lo: -Infinity, hi: -3, loC: false, hiC: false }, { lo: -3, hi: Infinity, loC: false, hiC: false }], domTex: 'x+3\\ne 0',
    range: [{ lo: -Infinity, hi: 0, loC: false, hiC: false }, { lo: 0, hi: Infinity, loC: false, hiC: false }],
    why: 'المقام لا يكون صفرًا: $x\\ne-3$. والكسر $\\frac{1}{\\ldots}$ لا يساوي صفرًا أبدًا، فالمدى كل الأعداد ما عدا 0.',
  },
  {
    id: 'parab', name: 'h', tex: '-x^2+4', f: (x) => -x * x + 4,
    dom: [{ lo: -Infinity, hi: Infinity, loC: false, hiC: false }], domTex: '\\text{no restriction}',
    range: [{ lo: -Infinity, hi: 4, loC: false, hiC: true }],
    why: 'كثيرة حدود: مجالها كل الأعداد. وبما أن $x^2\\ge0$ فإن $-x^2+4\\le 4$.',
  },
  {
    id: 'sqrt5', name: 'f', tex: '\\sqrt{5-x}', f: (x) => (x <= 5 ? Math.sqrt(5 - x) : NaN),
    dom: [{ lo: -Infinity, hi: 5, loC: false, hiC: true }], domTex: '5-x\\ge 0', range: [{ lo: 0, hi: Infinity, loC: true, hiC: false }],
    why: '$5-x\\ge 0$ تعني $x\\le 5$. والجذر لا يعطي قيمًا سالبة.',
  },
  {
    id: 'recip2', name: 'g', tex: '\\dfrac{1}{x^2-4}', f: (x) => 1 / (x * x - 4),
    dom: [
      { lo: -Infinity, hi: -2, loC: false, hiC: false },
      { lo: -2, hi: 2, loC: false, hiC: false },
      { lo: 2, hi: Infinity, loC: false, hiC: false },
    ],
    domTex: 'x^2-4\\ne0', range: [{ lo: -Infinity, hi: -0.25, loC: false, hiC: true }, { lo: 0, hi: Infinity, loC: false, hiC: false }],
    why: 'المقام $x^2-4=(x-2)(x+2)$ يُصفَّر عند $\\pm2$. وبما أن $x^2-4\\ge-4$ فالكسر إما $\\le-\\frac14$ أو موجب.',
  },
];

const MACHINE_FNS = [
  { id: 'sqrt', tex: 'f(x)=\\sqrt{x-2}', f: (x: number) => Math.sqrt(x - 2), ok: (x: number) => x >= 2, bad: 'ما تحت الجذر سالب' },
  { id: 'recip', tex: 'g(x)=\\frac{1}{x+3}', f: (x: number) => 1 / (x + 3), ok: (x: number) => x !== -3, bad: 'قسمة على صفر' },
  { id: 'parab', tex: 'h(x)=-x^2+4', f: (x: number) => -x * x + 4, ok: () => true, bad: '' },
  { id: 'sq1', tex: 'f(x)=x^2+1', f: (x: number) => x * x + 1, ok: () => true, bad: '' },
];

export function FunctionLab() {
  const [mode, setMode] = useState<'machine' | 'vlt' | 'domain'>('machine');
  const [fid, setFid] = useState('sqrt');
  const [x, setX] = useState(6);
  const [curve, setCurve] = useState<'cubic' | 'parab' | 'circle' | 'side'>('circle');
  const [v, setV] = useState(1);
  const [did, setDid] = useState('recip2');

  if (mode === 'machine') {
    const F = MACHINE_FNS.find((m) => m.id === fid)!;
    const ok = F.ok(x);
    const y = F.f(x);
    return (
      <LabShell
        scene={
          <>
            <FitCamera width={6.8} height={3} />
            <Chain
              stages={[{ tex: F.tex.split('=')[0], color: '#2c6ea6', info: { title: 'آلة الدالة', body: 'تأخذ مُدخلًا واحدًا $x$ وتُخرج **قيمة واحدة فقط** $f(x)$. إذا كان المُدخل خارج المجال تتوقف الآلة (تتحول للأحمر).' } }]}
              values={[
                { tex: `$x=${tn(x)}$`, ok: true },
                { tex: ok ? `$${fmt(y, 3)}$` : 'غير معرّفة', ok },
              ]}
              runKey={`${fid}:${x}`}
            />
          </>
        }
        readout={
          <div className="readout-eq">
            <Tex tex={F.tex} block />
            {ok ? (
              <Tex tex={`${F.tex.split('=')[0].replace('(x)', `(${tn(x)})`)} = ${fmt(y, 4)}`} block />
            ) : (
              <p className="readout-note warn">
                <RichInline text={`$x=${tn(x)}$ خارج المجال (${F.bad}) — لا يوجد ناتج حقيقي.`} />
              </p>
            )}
          </div>
        }
        controls={
          <>
            <ModeChoice mode={mode} setMode={setMode} />
            <Choice label="الدالة" value={fid} onChange={setFid} options={MACHINE_FNS.map((m) => ({ value: m.id, label: `$${m.tex}$` }))} />
            <Slider label="المُدخل $x$" value={x} min={-5} max={6} step={0.5} onChange={setX} />
          </>
        }
      />
    );
  }

  if (mode === 'vlt') {
    let pts: number[] = [];
    if (curve === 'cubic') pts = [v * v * v / 4 - v];
    if (curve === 'parab') pts = [v * v - 2];
    if (curve === 'circle') pts = Math.abs(v) < 3 ? [Math.sqrt(9 - v * v), -Math.sqrt(9 - v * v)] : Math.abs(v) === 3 ? [0] : [];
    if (curve === 'side') pts = v > 0 ? [Math.sqrt(v), -Math.sqrt(v)] : v === 0 ? [0] : [];
    const isFn = curve === 'cubic' || curve === 'parab';
    return (
      <LabShell
        scene={
          <>
            <FitCamera width={7.4} height={6.2} />
            <Plot3D x={[-5, 5]} y={[-4, 4]} width={7} height={5.6}>
              {curve === 'cubic' && <PlotCurve fn={(t) => (t * t * t) / 4 - t} color={ICE} />}
              {curve === 'parab' && <PlotCurve fn={(t) => t * t - 2} color={ICE} />}
              {curve === 'circle' && <PlotParam fx={(t) => 3 * Math.cos(t)} fy={(t) => 3 * Math.sin(t)} t={[0, Math.PI * 2]} color={ICE} />}
              {curve === 'side' && <PlotParam fx={(t) => t * t} fy={(t) => t} t={[-3, 3]} color={ICE} />}
              <PlotVLine x={v} color={pts.length > 1 ? BAD : AMBER} dashed={false} width={3} />
              {pts.map((p, i) => (
                <PlotPoint key={i} x={v} y={p} color={pts.length > 1 ? BAD : GOOD} size={1.2} />
              ))}
            </Plot3D>
          </>
        }
        readout={
          <div className="readout-eq">
            <p className="readout-note">
              <RichInline text={`الخط الرأسي $x=${tn(v)}$ يقطع المنحنى في **${pts.length}** ${pts.length === 1 ? 'نقطة' : 'نقاط'}.`} />
            </p>
            <p className={`readout-note ${isFn ? '' : 'warn'}`}>
              {isFn
                ? 'مهما حرّكت الخط لن يقطع المنحنى أكثر من مرة: المنحنى يمثل دالة.'
                : 'يوجد خط رأسي يقطع المنحنى مرتين: المُدخل نفسه له ناتجان، إذن المنحنى ليس دالة في x.'}
            </p>
          </div>
        }
        controls={
          <>
            <ModeChoice mode={mode} setMode={setMode} />
            <Choice
              label="المنحنى"
              value={curve}
              onChange={setCurve}
              options={[
                { value: 'cubic', label: '$y=\\frac{x^3}{4}-x$' },
                { value: 'parab', label: '$y=x^2-2$' },
                { value: 'circle', label: '$x^2+y^2=9$' },
                { value: 'side', label: '$x=y^2$' },
              ]}
            />
            <Slider label="موضع الخط الرأسي $x$" value={v} min={-4.5} max={4.5} step={0.25} onChange={setV} />
          </>
        }
      />
    );
  }

  const D = EX20.find((d) => d.id === did)!;
  const excluded = D.dom.length > 1 ? D.dom.slice(1).map((d) => d.lo) : [];
  return (
    <LabShell
      scene={
        <>
          <FitCamera width={8.4} height={6.2} />
          <Plot3D x={[-7, 7]} y={[-5, 6]} width={8} height={5.8}>
            {excluded.map((e) => (
              <PlotVLine key={e} x={e} color={BAD} />
            ))}
            <PlotCurve fn={D.f} color={ICE} />
            {D.dom.map((d, i) => (
              <PlotAxisBand key={'d' + i} from={d.lo} to={d.hi} closedFrom={d.loC} closedTo={d.hiC} color={GOOD} />
            ))}
            {D.range.map((d, i) => (
              <PlotAxisBand key={'r' + i} axis="y" from={d.lo} to={d.hi} closedFrom={d.loC} closedTo={d.hiC} color={AMBER} />
            ))}
            <PlotText x={5.4} y={-0.9} text="المجال" color={GOOD} />
            <PlotText x={1.1} y={5.4} text="المدى" color={AMBER} />
          </Plot3D>
        </>
      }
      readout={
        <div className="readout-eq">
          <Tex tex={`${D.name}(x)=${D.tex}`} block />
          <Tex tex={`\\text{Domain: } ${setTex(D.dom)}\\qquad \\text{Range: } ${setTex(D.range)}`} block />
          <p className="readout-note">
            <RichInline text={D.why} />
          </p>
        </div>
      }
      controls={
        <>
          <ModeChoice mode={mode} setMode={setMode} />
          <Choice label="دوال المثال 20" value={did} onChange={setDid} options={EX20.map((d) => ({ value: d.id, label: `$${d.tex}$` }))} />
        </>
      }
    />
  );
}

function ModeChoice({ mode, setMode }: { mode: 'machine' | 'vlt' | 'domain'; setMode: (m: 'machine' | 'vlt' | 'domain') => void }) {
  return (
    <Choice
      label="التجربة"
      value={mode}
      onChange={setMode}
      options={[
        { value: 'machine', label: 'آلة الدالة' },
        { value: 'vlt', label: 'اختبار الخط الرأسي' },
        { value: 'domain', label: 'المجال والمدى' },
      ]}
    />
  );
}

/* ───────────────────────── 1.7 Shifts ───────────────────────── */

const BASES: { id: string; tex: (inner: string) => string; f: Fn; key: [number, number]; name: string }[] = [
  { id: 'sq', name: '$x^2$', tex: (i) => (i === 'x' ? 'x^2' : `(${i})^2`), f: (x) => x * x, key: [0, 0] },
  { id: 'abs', name: '$|x|$', tex: (i) => `|${i}|`, f: Math.abs, key: [0, 0] },
  { id: 'sqrt', name: '$\\sqrt{x}$', tex: (i) => `\\sqrt{${i}}`, f: (x) => (x >= 0 ? Math.sqrt(x) : NaN), key: [0, 0] },
  { id: 'cube', name: '$x^3$', tex: (i) => (i === 'x' ? 'x^3' : `(${i})^3`), f: (x) => x * x * x, key: [0, 0] },
];

export function TransformLab() {
  const [bid, setBid] = useState('sq');
  const [h, setH] = useState(2);
  const [k, setK] = useState(-2);
  const B = BASES.find((b) => b.id === bid)!;
  const g = useMemo(() => (x: number) => B.f(x - h) + k, [B, h, k]);
  const inner = h === 0 ? 'x' : h > 0 ? `x-${tn(h)}` : `x+${tn(-h)}`;
  const tail = k === 0 ? '' : k > 0 ? `+${tn(k)}` : `-${tn(-k)}`;
  const words = [
    h > 0 ? `${fmt(h)} إلى اليمين` : h < 0 ? `${fmt(-h)} إلى اليسار` : '',
    k > 0 ? `${fmt(k)} إلى الأعلى` : k < 0 ? `${fmt(-k)} إلى الأسفل` : '',
  ].filter(Boolean);
  return (
    <LabShell
      scene={
        <>
          <FitCamera width={8.4} height={6} />
          <Plot3D x={[-7, 7]} y={[-6, 8]} width={8} height={5.8}>
            <PlotCurve fn={B.f} color="#7d8ea6" opacity={0.45} radius={0.035} />
            <PlotCurve fn={g} color={ICE} />
            <PlotPoint x={0} y={0} color="#7d8ea6" size={0.8} />
            <PlotPoint x={h} y={k} color={AMBER} label={`$(${tn(h)},\\ ${tn(k)})$`} />
            {(h !== 0 || k !== 0) && <PlotSegment from={[0, 0]} to={[h, k]} color={AMBER} dashed />}
          </Plot3D>
        </>
      }
      readout={
        <div className="readout-eq">
          <Tex tex={`y = ${B.tex(inner)}${tail}`} block />
          <p className="readout-note">
            <RichInline text={words.length ? `منحنى $y=${B.tex('x')}$ انزاح ${words.join(' و')}.` : 'لا إزاحة: المنحنى الأصلي نفسه.'} />
          </p>
          <p className="readout-note">
            <RichInline text="انتبه: $f(x-c)$ يزيح إلى **اليمين** رغم إشارة الطرح، لأننا نحتاج $x$ أكبر بمقدار $c$ لنحصل على القيمة نفسها." />
          </p>
        </div>
      }
      controls={
        <>
          <Choice label="الدالة الأصلية" value={bid} onChange={setBid} options={BASES.map((b) => ({ value: b.id, label: b.name }))} />
          <Slider label="إزاحة أفقية $c$ في $f(x-c)$" value={h} min={-5} max={5} step={0.5} onChange={setH} />
          <Slider label="إزاحة رأسية $c$ في $f(x)+c$" value={k} min={-5} max={5} step={0.5} onChange={setK} />
        </>
      }
    />
  );
}

/* ───────────────────────── 1.7 Algebra & composition ───────────────────────── */

const PAIRS = {
  ex9: {
    label: 'مثال 9: $f=x^2,\\ g=x-3$',
    fTex: 'x^2', gTex: 'x-3',
    f: (x: number) => x * x, fOk: () => true,
    g: (x: number) => x - 3, gOk: () => true,
    fg: '(x-3)^2', gf: 'x^2-3', fgDom: '\\mathbb{R}', gfDom: '\\mathbb{R}',
  },
  ex10: {
    label: 'مثال 10: $f=\\sqrt{x},\\ g=\\sqrt{2-x}$',
    fTex: '\\sqrt{x}', gTex: '\\sqrt{2-x}',
    f: (x: number) => Math.sqrt(x), fOk: (x: number) => x >= 0,
    g: (x: number) => Math.sqrt(2 - x), gOk: (x: number) => x <= 2,
    fg: '\\sqrt{\\sqrt{2-x}}=\\sqrt[4]{2-x}', gf: '\\sqrt{2-\\sqrt{x}}', fgDom: '(-\\infty,2]', gfDom: '[0,4]',
  },
};

const ALG = {
  ex7: {
    label: 'مثال 7: $f=8x-9,\\ g=\\sqrt{2x-1}$',
    f: (x: number) => 8 * x - 9, g: (x: number) => (x >= 0.5 ? Math.sqrt(2 * x - 1) : NaN),
    fTex: '8x-9', gTex: '\\sqrt{2x-1}', x: [-1, 3] as [number, number], y: [-14, 36] as [number, number],
    dom: { add: '[\\tfrac12,\\infty)', sub: '[\\tfrac12,\\infty)', mul: '[\\tfrac12,\\infty)', div: '(\\tfrac12,\\infty)' },
    band: { add: [0.5, Infinity, true], sub: [0.5, Infinity, true], mul: [0.5, Infinity, true], div: [0.5, Infinity, false] },
  },
  ex8: {
    label: 'مثال 8: $f=\\sqrt{x},\\ g=\\sqrt{1-x}$',
    f: (x: number) => (x >= 0 ? Math.sqrt(x) : NaN), g: (x: number) => (x <= 1 ? Math.sqrt(1 - x) : NaN),
    fTex: '\\sqrt{x}', gTex: '\\sqrt{1-x}', x: [-0.6, 1.6] as [number, number], y: [-1.6, 3.2] as [number, number],
    dom: { add: '[0,1]', sub: '[0,1]', mul: '[0,1]', div: '[0,1)' },
    band: { add: [0, 1, true, true], sub: [0, 1, true, true], mul: [0, 1, true, true], div: [0, 1, true, false] },
  },
};

type AlgOp = 'add' | 'sub' | 'mul' | 'div';

export function CompositionLab() {
  const [mode, setMode] = useState<'comp' | 'alg'>('comp');
  const [pid, setPid] = useState<'ex9' | 'ex10'>('ex9');
  const [order, setOrder] = useState<'fg' | 'gf'>('fg');
  const [x, setX] = useState(5);
  const [aid, setAid] = useState<'ex7' | 'ex8'>('ex8');
  const [op, setOp] = useState<AlgOp>('div');

  if (mode === 'comp') {
    const P = PAIRS[pid];
    const first = order === 'fg' ? { n: 'g', tex: P.gTex, f: P.g, ok: P.gOk } : { n: 'f', tex: P.fTex, f: P.f, ok: P.fOk };
    const second = order === 'fg' ? { n: 'f', tex: P.fTex, f: P.f, ok: P.fOk } : { n: 'g', tex: P.gTex, f: P.g, ok: P.gOk };
    const ok1 = first.ok(x);
    const m = ok1 ? first.f(x) : NaN;
    const ok2 = ok1 && second.ok(m);
    const out = ok2 ? second.f(m) : NaN;
    return (
      <LabShell
        scene={
          <>
            <FitCamera width={8.6} height={3} />
            <Chain
              stages={[
                { tex: `${first.n}(x)=${first.tex}`, color: '#2c6ea6', info: { title: 'الآلة الأولى (الداخلية)', body: 'في $f\\circ g$ نطبّق $g$ أولًا لأنها الأقرب إلى $x$ في $f(g(x))$.' } },
                { tex: `${second.n}(x)=${second.tex}`, color: '#a8742a', info: { title: 'الآلة الثانية (الخارجية)', body: 'تستقبل ناتج الآلة الأولى وتعالجه. إذا كان ناتج الأولى خارج مجالها تتوقف.' } },
              ]}
              values={[
                { tex: `$x=${tn(x)}$`, ok: true },
                { tex: ok1 ? `$${first.n}(x)=${fmt(m, 3)}$` : 'غير معرّف', ok: ok1 },
                { tex: ok2 ? `$${fmt(out, 3)}$` : 'غير معرّف', ok: ok2 },
              ]}
              runKey={`${pid}${order}${x}`}
            />
          </>
        }
        readout={
          <div className="readout-eq">
            <Tex tex={`(${second.n}\\circ ${first.n})(x) = ${second.n}(${first.n}(x)) = ${order === 'fg' ? P.fg : P.gf}`} block />
            <Tex tex={`\\text{Domain} = ${order === 'fg' ? P.fgDom : P.gfDom}`} block />
            {ok2 ? (
              <Tex tex={`(${second.n}\\circ ${first.n})(${tn(x)}) = ${second.n}(${fmt(m, 3)}) = ${fmt(out, 4)}`} block />
            ) : (
              <p className="readout-note warn">
                <RichInline text={!ok1 ? `$x=${tn(x)}$ ليس في مجال $${first.n}$.` : `الناتج الأوسط $${fmt(m, 3)}$ ليس في مجال $${second.n}$، إذن $x$ خارج مجال التركيب.`} />
              </p>
            )}
          </div>
        }
        controls={
          <>
            <Choice label="التجربة" value={mode} onChange={setMode} options={[{ value: 'comp', label: 'تركيب الدوال' }, { value: 'alg', label: 'جبر الدوال' }]} />
            <Choice label="الزوج" value={pid} onChange={setPid} options={(['ex9', 'ex10'] as const).map((k) => ({ value: k, label: PAIRS[k].label }))} />
            <Choice label="الترتيب" value={order} onChange={setOrder} options={[{ value: 'fg', label: '$f\\circ g$' }, { value: 'gf', label: '$g\\circ f$' }]} />
            <Slider label="المُدخل $x$" value={x} min={-4} max={6} step={0.5} onChange={setX} />
          </>
        }
      />
    );
  }

  const A = ALG[aid];
  const opFn: Record<AlgOp, Fn> = {
    add: (t) => A.f(t) + A.g(t),
    sub: (t) => A.f(t) - A.g(t),
    mul: (t) => A.f(t) * A.g(t),
    div: (t) => (A.g(t) === 0 ? NaN : A.f(t) / A.g(t)),
  };
  const sym: Record<AlgOp, string> = { add: 'f+g', sub: 'f-g', mul: 'fg', div: '\\frac{f}{g}' };
  const formula: Record<AlgOp, string> = {
    add: `${A.fTex}+${A.gTex}`,
    sub: `${A.fTex}-${A.gTex}`,
    mul: `(${A.fTex})${A.gTex}`,
    div: `\\dfrac{${A.fTex}}{${A.gTex}}`,
  };
  const band = A.band[op] as (number | boolean)[];
  return (
    <LabShell
      scene={
        <>
          <FitCamera width={8.4} height={6} />
          <Plot3D x={A.x} y={A.y} width={8} height={5.6}>
            <PlotCurve fn={A.f} color={ICE} opacity={0.45} radius={0.035} />
            <PlotCurve fn={A.g} color={AMBER} opacity={0.45} radius={0.035} />
            <PlotCurve fn={opFn[op]} color={MINT} samples={600} />
            <PlotAxisBand from={band[0] as number} to={band[1] as number} closedFrom={band[2] as boolean} closedTo={(band[3] as boolean) ?? false} color={GOOD} />
          </Plot3D>
        </>
      }
      readout={
        <div className="readout-eq">
          <Tex tex={`\\color{#8fd3ff}{f(x)=${A.fTex}}\\qquad \\color{#ffb547}{g(x)=${A.gTex}}`} block />
          <Tex tex={`\\color{#5ee6b5}{\\left(${sym[op]}\\right)(x) = ${formula[op]}}`} block />
          <Tex tex={`\\text{Domain} = ${A.dom[op]}`} block />
          <p className="readout-note">
            <RichInline text={op === 'div' ? 'المجال هو التقاطع بين المجالين **مع استبعاد** النقاط التي يكون فيها $g(x)=0$.' : 'المجال هو **تقاطع** مجال $f$ ومجال $g$: يجب أن يكون $x$ مقبولًا في الاثنتين معًا.'} />
          </p>
        </div>
      }
      controls={
        <>
          <Choice label="التجربة" value={mode} onChange={setMode} options={[{ value: 'comp', label: 'تركيب الدوال' }, { value: 'alg', label: 'جبر الدوال' }]} />
          <Choice label="الزوج" value={aid} onChange={setAid} options={(['ex7', 'ex8'] as const).map((k) => ({ value: k, label: ALG[k].label }))} />
          <Choice
            label="العملية"
            value={op}
            onChange={setOp}
            options={[
              { value: 'add', label: '$f+g$' },
              { value: 'sub', label: '$f-g$' },
              { value: 'mul', label: '$fg$' },
              { value: 'div', label: '$f/g$' },
            ]}
          />
        </>
      }
    />
  );
}

/* ───────────────────────── 1.7 Catalog of functions ───────────────────────── */

const DEG_NAMES = ['ثابتة', 'خطية', 'تربيعية', 'تكعيبية', 'رباعية (Quartic)', 'خماسية'];

export function CatalogLab() {
  const [fam, setFam] = useState('poly');
  const [p1, setP1] = useState(1);
  const [p2, setP2] = useState(-1);
  const [n, setN] = useState(3);

  const F = useMemo(() => {
    switch (fam) {
      case 'const':
        return { fn: () => p1, tex: `f(x)=${tn(p1)}`, cat: 'ثابتة', form: 'f(x)=c', note: 'خط أفقي: الناتج نفسه لكل مُدخل.' };
      case 'linear':
        return { fn: (x: number) => p1 * x + p2, tex: `f(x)=${tn(p1)}x${p2 >= 0 ? '+' : ''}${tn(p2)}`, cat: 'خطية', form: 'f(x)=mx+b', note: '$m$ = الميل (كم يرتفع الخط لكل خطوة إلى اليمين)، $b$ = نقطة التقاطع مع محور $y$.' };
      case 'quad':
        return { fn: (x: number) => p1 * x * x + p2 * x - 2, tex: `f(x)=${tn(p1)}x^2${p2 >= 0 ? '+' : ''}${tn(p2)}x-2`, cat: 'تربيعية', form: 'f(x)=ax^2+bx+c,\\ a\\ne0', note: 'قطع مكافئ: يفتح للأعلى إذا $a>0$ وللأسفل إذا $a<0$.' };
      case 'poly':
        return { fn: (x: number) => Math.pow(x, n), tex: `f(x)=x^{${n}}`, cat: `كثيرة حدود من الدرجة ${n} (${DEG_NAMES[n] ?? ''})`, form: 'f(x)=a_nx^n+\\cdots+a_1x+a_0', note: n % 2 === 0 ? 'الدرجة زوجية: الطرفان يتجهان للأعلى معًا.' : 'الدرجة فردية: طرف للأسفل وطرف للأعلى.' };
      case 'root':
        return { fn: (x: number) => (n === 2 ? (x >= 0 ? Math.sqrt(x) : NaN) : Math.cbrt(x)), tex: n === 2 ? 'f(x)=\\sqrt{x}' : 'f(x)=\\sqrt[3]{x}', cat: 'جذرية', form: 'f(x)=\\sqrt[n]{x}', note: n === 2 ? 'الجذر الزوجي معرّف فقط عندما $x\\ge0$.' : 'الجذر التكعيبي معرّف لكل الأعداد، حتى السالبة: $\\sqrt[3]{-8}=-2$.' };
      case 'rational':
        return { fn: (x: number) => 1 / x, tex: 'f(x)=\\frac{1}{x}', cat: 'كسرية', form: 'f(x)=\\frac{P(x)}{Q(x)}', note: 'غير معرّفة عند $x=0$؛ كلما اقترب $x$ من الصفر كبرت القيمة جدًا.' };
      case 'abs':
        return { fn: Math.abs, tex: 'f(x)=|x|', cat: 'قيمة مطلقة', form: 'f(x)=|x|', note: 'شكل V: الأعداد السالبة تنقلب موجبة.' };
      case 'exp':
        return { fn: (x: number) => Math.pow(2, x), tex: 'f(x)=2^x', cat: 'أسية', form: 'f(x)=a^x,\\ a>0,\\ a\\ne1', note: 'المتغيّر في الأس: النمو يتضاعف بسرعة.' };
      case 'log':
        return { fn: (x: number) => (x > 0 ? Math.log2(x) : NaN), tex: 'f(x)=\\log_2 x', cat: 'لوغاريتمية', form: 'f(x)=\\log_a x', note: 'معكوس الأسية: معرّفة فقط للأعداد الموجبة.' };
      default:
        return { fn: Math.sin, tex: 'f(x)=\\sin x', cat: 'مثلثية', form: 'f(x)=\\sin x,\\ \\cos x,\\ \\tan x', note: 'دورية: تتكرر قيمها كل $2\\pi$.' };
    }
  }, [fam, p1, p2, n]);

  return (
    <LabShell
      scene={
        <>
          <FitCamera width={8.4} height={6} />
          <Plot3D x={[-5, 5]} y={[-5, 5]} width={7.6} height={5.6}>
            <PlotCurve fn={F.fn} color={ICE} samples={600} />
          </Plot3D>
        </>
      }
      readout={
        <div className="readout-eq">
          <Tex tex={F.tex} block />
          <p className="readout-note">
            <RichInline text={`التصنيف: **${F.cat}** — الشكل العام $${F.form}$`} />
          </p>
          <p className="readout-note">
            <RichInline text={F.note} />
          </p>
        </div>
      }
      controls={
        <>
          <Choice
            label="العائلة"
            value={fam}
            onChange={setFam}
            options={[
              { value: 'const', label: 'ثابتة' },
              { value: 'linear', label: 'خطية' },
              { value: 'quad', label: 'تربيعية' },
              { value: 'poly', label: 'قوة $x^n$' },
              { value: 'root', label: 'جذرية' },
              { value: 'rational', label: 'كسرية' },
              { value: 'abs', label: 'مطلقة' },
              { value: 'exp', label: 'أسية' },
              { value: 'log', label: 'لوغاريتمية' },
              { value: 'trig', label: 'مثلثية' },
            ]}
          />
          {(fam === 'const' || fam === 'linear' || fam === 'quad') && (
            <Slider label={fam === 'const' ? '$c$' : fam === 'linear' ? 'الميل $m$' : '$a$'} value={p1} min={-3} max={3} step={0.5} onChange={setP1} />
          )}
          {(fam === 'linear' || fam === 'quad') && <Slider label={fam === 'linear' ? '$b$' : '$b$'} value={p2} min={-4} max={4} step={0.5} onChange={setP2} />}
          {fam === 'poly' && <Slider label="الدرجة $n$" value={n} min={0} max={5} step={1} onChange={setN} />}
          {fam === 'root' && <Choice label="رتبة الجذر" value={n === 2 ? 2 : 3} onChange={setN} options={[{ value: 2, label: '$\\sqrt{x}$' }, { value: 3, label: '$\\sqrt[3]{x}$' }]} />}
          {fam === 'quad' && p1 === 0 && (
            <p className="readout-note warn">
              <RichInline text="عندما $a=0$ تصبح الدالة خطية وليست تربيعية." />
            </p>
          )}
        </>
      }
    />
  );
}

