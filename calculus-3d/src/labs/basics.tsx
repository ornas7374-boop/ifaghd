import { Edges, RoundedBox } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Btn, Choice, Row, Slider, Toggle } from '../components/Controls';
import { LabShell } from '../components/LabShell';
import { RichInline, Tex } from '../components/Tex';
import { fmt, tn } from '../lib/text';
import { FitCamera, Float, Hot, Label } from '../three/core';

/* ───────────────────────── 1.1 Number sets ───────────────────────── */

type SetKey = 'N' | 'Z' | 'Q' | 'I' | 'R';
interface NumTok {
  id: string;
  tex: string;
  sets: SetKey[];
  why: string;
}
const TOKENS: NumTok[] = [
  { id: '5', tex: '5', sets: ['N', 'Z', 'Q', 'R'], why: 'عدد عدّ، وهو أيضًا $\\frac{5}{1}$ لذلك نسبي.' },
  { id: 's16', tex: '\\sqrt{16}', sets: ['N', 'Z', 'Q', 'R'], why: '$\\sqrt{16}=4$، فهو عدد طبيعي متنكّر.' },
  { id: 's9', tex: '\\sqrt{9}', sets: ['N', 'Z', 'Q', 'R'], why: '$\\sqrt{9}=3$، لذلك **ليس** غير نسبي رغم وجود الجذر.' },
  { id: '0', tex: '0', sets: ['Z', 'Q', 'R'], why: 'الأعداد الطبيعية في هذا المقرر تبدأ من 1، لذلك 0 صحيح لكنه ليس طبيعيًا.' },
  { id: 'm3', tex: '-3', sets: ['Z', 'Q', 'R'], why: 'عدد صحيح سالب: ليس من أعداد العدّ.' },
  { id: 'm8', tex: '-8', sets: ['Z', 'Q', 'R'], why: 'صحيح سالب، ويكتب $\\frac{-8}{1}$.' },
  { id: '23', tex: '\\tfrac{2}{3}', sets: ['Q', 'R'], why: 'نسبة بين عددين صحيحين، وكسره العشري $0.\\overline{6}$ يتكرر.' },
  { id: '075', tex: '0.75', sets: ['Q', 'R'], why: '$0.75=\\frac{3}{4}$ كسر عشري منتهٍ.' },
  { id: 'm175', tex: '-1.75', sets: ['Q', 'R'], why: '$-1.75=-\\frac{7}{4}$.' },
  { id: 'r2', tex: '\\sqrt{2}', sets: ['I', 'R'], why: 'كسره العشري $1.41421\\ldots$ لا ينتهي ولا يتكرر.' },
  { id: 'pi', tex: '\\pi', sets: ['I', 'R'], why: '$\\pi=3.14159\\ldots$ لا ينتهي ولا يتكرر.' },
  { id: 'e', tex: 'e', sets: ['I', 'R'], why: '$e=2.71828\\ldots$ عدد غير نسبي مهم جدًا في التفاضل.' },
  { id: 'r10', tex: '\\sqrt{10}', sets: ['I', 'R'], why: '10 ليس مربعًا كاملًا، فجذره غير نسبي.' },
];

const SET_INFO: Record<SetKey, { name: string; tex: string; color: string; body: string }> = {
  N: { name: 'الأعداد الطبيعية', tex: '\\mathbb{N}', color: '#ffb547', body: '$\\mathbb{N}=\\{1,2,3,\\ldots\\}$ أعداد العدّ.' },
  Z: { name: 'الأعداد الصحيحة', tex: '\\mathbb{Z}', color: '#5ee6b5', body: '$\\mathbb{Z}=\\{\\ldots,-2,-1,0,1,2,\\ldots\\}$ الطبيعية مع الصفر وسالباتها.' },
  Q: { name: 'الأعداد النسبية', tex: '\\mathbb{Q}', color: '#8fd3ff', body: '$\\mathbb{Q}=\\{\\frac{p}{q}: p,q\\in\\mathbb{Z},\\ q\\ne 0\\}$ كسرها العشري منتهٍ أو دوري.' },
  I: { name: 'الأعداد غير النسبية', tex: '\\mathbb{R}\\setminus\\mathbb{Q}', color: '#ff7a85', body: 'أعداد حقيقية ليست نسبية: كسرها العشري لا ينتهي ولا يتكرر، مثل $\\sqrt2,\\ \\pi,\\ e$.' },
  R: { name: 'الأعداد الحقيقية', tex: '\\mathbb{R}', color: '#c9b8ff', body: '$\\mathbb{R}=\\mathbb{Q}\\cup\\{\\text{غير النسبية}\\}$: كل نقاط خط الأعداد.' },
};

function tokenHome(t: NumTok, i: number): [number, number, number] {
  const inner: SetKey = t.sets[0];
  const band: Record<SetKey, [number, number]> = { N: [0.35, 0.7], Z: [1.35, 1.65], Q: [2.3, 2.6], I: [3.35, 3.7], R: [3.4, 3.7] };
  const [r0, r1] = band[inner];
  const r = r0 + ((i * 37) % 10) / 10 * (r1 - r0);
  const a = i * 2.39996;
  const yy = Math.sin(i * 1.7) * 0.55;
  return [Math.cos(a) * r, yy * (inner === 'N' ? 0.4 : 1), Math.sin(a) * r * 0.55];
}

function Shell({ k, r, active, position = [0, 0, 0] }: { k: SetKey; r: number; active: boolean; position?: [number, number, number] }) {
  const s = SET_INFO[k];
  return (
    <Hot info={{ title: `${s.name} $${s.tex}$`, body: s.body }}>
      <group position={position}>
        <mesh>
          <sphereGeometry args={[r, 48, 32]} />
          <meshStandardMaterial color={s.color} transparent opacity={active ? 0.16 : 0.05} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
        <mesh>
          <icosahedronGeometry args={[r, 1]} />
          <meshBasicMaterial color={s.color} wireframe transparent opacity={active ? 0.18 : 0.05} />
        </mesh>
        <Label position={[0, r + 0.25, 0]} text={`$${s.tex}$ ${s.name}`} color={s.color} size="s" className={active ? 'lbl-strong' : ''} />
      </group>
    </Hot>
  );
}

function NumberToken({ t, i, selected, onPick }: { t: NumTok; i: number; selected: boolean; onPick: () => void }) {
  const home = useMemo(() => tokenHome(t, i), [t, i]);
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const s = selected ? 1.5 + Math.sin(clock.elapsedTime * 4) * 0.12 : 1;
    ref.current.scale.lerp(new THREE.Vector3(s, s, s), 0.15);
  });
  const color = SET_INFO[t.sets[0]].color;
  return (
    <group
      ref={ref}
      position={home}
      onClick={(e) => {
        e.stopPropagation();
        onPick();
      }}
      onPointerOver={() => (document.body.style.cursor = 'pointer')}
      onPointerOut={() => (document.body.style.cursor = '')}
    >
      <mesh>
        <sphereGeometry args={[0.13, 18, 18]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={selected ? 1.2 : 0.5} toneMapped={false} />
      </mesh>
      <Label position={[0, 0.3, 0]} text={`$${t.tex}$`} size="s" className={selected ? 'lbl-strong' : ''} />
    </group>
  );
}

export function NumberSetsLab() {
  const [sel, setSel] = useState('s9');
  const t = TOKENS.find((x) => x.id === sel)!;
  const has = (k: SetKey) => t.sets.includes(k);
  const groupRef = useRef<THREE.Group>(null);
  return (
    <LabShell
      scene={
        <>
          <FitCamera width={8.6} height={8.4} tilt={[0.15, 0.35]} />
          <group ref={groupRef}>
            <Shell k="R" r={4.1} active={has('R')} />
            <Shell k="Q" r={2.85} active={has('Q')} position={[-0.0, 0, 0]} />
            <Shell k="Z" r={1.85} active={has('Z')} />
            <Shell k="N" r={0.95} active={has('N')} />
            <Label position={[3.6, -1.9, 0]} text="غير النسبية: المنطقة خارج $\mathbb{Q}$" color={SET_INFO.I.color} size="s" />
            {TOKENS.map((tok, i) => (
              <NumberToken key={tok.id} t={tok} i={i} selected={tok.id === sel} onPick={() => setSel(tok.id)} />
            ))}
          </group>
        </>
      }
      readout={
        <div className="readout-grid">
          <div className="big-tex">
            <Tex tex={t.tex} />
          </div>
          <div className="chips">
            {(['N', 'Z', 'Q', 'I', 'R'] as SetKey[]).map((k) => (
              <span key={k} className={`chip ${has(k) ? 'chip-yes' : 'chip-no'}`}>
                {has(k) ? '✓' : '✗'} <Tex tex={SET_INFO[k].tex} /> {SET_INFO[k].name}
              </span>
            ))}
          </div>
          <p className="readout-note">
            <RichInline text={t.why} />
          </p>
        </div>
      }
      controls={
        <Choice
          label="اختر عددًا وشاهد أين يسكن (أو اضغط عليه في المشهد):"
          value={sel}
          onChange={setSel}
          options={TOKENS.map((x) => ({ value: x.id, label: `$${x.tex}$` }))}
        />
      }
    />
  );
}

/* ───────────────────────── 1.2 Algebraic properties ───────────────────────── */

function Slab({ w, h, pos, color, label, depth = 0.5 }: { w: number; h: number; pos: [number, number, number]; color: string; label?: string; depth?: number }) {
  return (
    <group position={pos}>
      <mesh>
        <boxGeometry args={[Math.max(w, 0.001), Math.max(h, 0.001), depth]} />
        <meshStandardMaterial color={color} transparent opacity={0.82} roughness={0.4} metalness={0.15} />
        <Edges color="#ffffff" threshold={15} />
      </mesh>
      {label && <Label position={[0, 0, depth / 2 + 0.05]} text={label} size="m" />}
    </group>
  );
}

function SpinGroup({ angle, children }: { angle: number; children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.z += (angle - ref.current.rotation.z) * Math.min(1, dt * 4);
  });
  return <group ref={ref}>{children}</group>;
}

export function AlgebraLab() {
  const [mode, setMode] = useState<'dist' | 'comm'>('dist');
  const [a, setA] = useState(3);
  const [b, setB] = useState(2);
  const [c, setC] = useState(4);
  const [turned, setTurned] = useState(false);
  const S = 0.62;
  return (
    <LabShell
      scene={
        <>
          <FitCamera width={7.5} height={6.5} />
          <Float amp={0.05}>
            {mode === 'dist' ? (
              <group position={[(-a * S) / 2, (-(b + c) * S) / 2, 0]}>
                <Slab w={a * S} h={b * S} pos={[(a * S) / 2, (b * S) / 2, 0]} color="#3d7fb8" label={`$ab=${tn(a * b)}$`} />
                <Slab w={a * S} h={c * S} pos={[(a * S) / 2, b * S + (c * S) / 2 + 0.06, 0]} color="#b8822c" label={`$ac=${tn(a * c)}$`} />
                <Label position={[(a * S) / 2, -0.35, 0]} text={`$a=${tn(a)}$`} size="s" />
                <Label position={[a * S + 0.55, (b * S) / 2, 0]} text={`$b=${tn(b)}$`} color="#8fd3ff" size="s" />
                <Label position={[a * S + 0.55, b * S + (c * S) / 2, 0]} text={`$c=${tn(c)}$`} color="#ffb547" size="s" />
                <Label position={[-0.9, ((b + c) * S) / 2, 0]} text={`$b+c=${tn(b + c)}$`} size="s" />
              </group>
            ) : (
              <SpinGroup angle={turned ? Math.PI / 2 : 0}>
                <Slab w={a * S} h={b * S} pos={[0, 0, 0]} color="#3d7fb8" label={`$${tn(a)}\\times${tn(b)}=${tn(a * b)}$`} />
              </SpinGroup>
            )}
          </Float>
        </>
      }
      readout={
        mode === 'dist' ? (
          <div className="readout-eq">
            <Tex tex={`a(b+c) = ${tn(a)}(${tn(b)}+${tn(c)}) = ${tn(a)}\\times ${tn(b + c)} = \\mathbf{${tn(a * (b + c))}}`} block />
            <Tex tex={`ab+ac = ${tn(a * b)} + ${tn(a * c)} = \\mathbf{${tn(a * b + a * c)}}`} block />
            <p className="readout-note">المساحة الكلية للمستطيل الكبير = مجموع مساحتي القطعتين. هذا هو قانون التوزيع.</p>
          </div>
        ) : (
          <div className="readout-eq">
            <Tex tex={`ab = ${tn(a)}\\times${tn(b)} = ${tn(a * b)} \\qquad ba = ${tn(b)}\\times${tn(a)} = ${tn(a * b)}`} block />
            <p className="readout-note">تدوير المستطيل لا يغيّر مساحته: ترتيب الضرب لا يهم (الإبدال).</p>
          </div>
        )
      }
      controls={
        <>
          <Choice
            label="الخاصية"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'dist', label: 'التوزيع $a(b+c)$' },
              { value: 'comm', label: 'الإبدال $ab=ba$' },
            ]}
          />
          <Slider label="$a$" value={a} min={1} max={5} step={0.5} onChange={setA} />
          <Slider label="$b$" value={b} min={1} max={5} step={0.5} onChange={setB} />
          {mode === 'dist' ? (
            <Slider label="$c$" value={c} min={1} max={5} step={0.5} onChange={setC} />
          ) : (
            <Row>
              <Btn kind="primary" onClick={() => setTurned((v) => !v)}>
                {turned ? 'أعِد المستطيل' : 'دوّر المستطيل 90°'}
              </Btn>
            </Row>
          )}
        </>
      }
    />
  );
}

/* ───────────────────────── 1.2 Factoring formulas ───────────────────────── */

function MovingSlab({
  from,
  to,
  rotFrom,
  rotTo,
  t,
  w,
  h,
  color,
  label,
}: {
  from: [number, number];
  to: [number, number];
  rotFrom: number;
  rotTo: number;
  t: number;
  w: number;
  h: number;
  color: string;
  label?: string;
}) {
  const ref = useRef<THREE.Group>(null);
  const cur = useRef(t);
  useFrame((_, dt) => {
    cur.current += (t - cur.current) * Math.min(1, dt * 3);
    const k = cur.current;
    if (ref.current) {
      ref.current.position.set(from[0] + (to[0] - from[0]) * k, from[1] + (to[1] - from[1]) * k, Math.sin(k * Math.PI) * 1.2);
      ref.current.rotation.z = rotFrom + (rotTo - rotFrom) * k;
    }
  });
  return (
    <group ref={ref}>
      <Slab w={w} h={h} pos={[0, 0, 0]} color={color} label={label} depth={0.4} />
    </group>
  );
}

export function FactoringLab() {
  const [mode, setMode] = useState<'diff' | 'square'>('diff');
  const [a, setA] = useState(5);
  const [b, setB] = useState(2);
  const [go, setGo] = useState(false);
  const bb = Math.min(b, a - 0.5);
  const S = 0.6;
  const A = a * S;
  const B = bb * S;
  return (
    <LabShell
      scene={
        <>
          <FitCamera width={mode === 'diff' ? (a + bb) * S + 1.5 : (a + bb) * S + 1.5} height={a * S + 1.6} />
          {mode === 'diff' ? (
            <group position={[-(A + B) / 2, -A / 2, 0]}>
              {/* bottom strip: a × (a−b) */}
              <Slab w={A} h={A - B} pos={[A / 2, (A - B) / 2, 0]} color="#3d7fb8" label={`$a(a-b)$`} depth={0.4} />
              {/* top-left strip: (a−b) × b, moves to the right */}
              <MovingSlab
                from={[(A - B) / 2, A - B + B / 2]}
                to={[A + B / 2, (A - B) / 2]}
                rotFrom={0}
                rotTo={-Math.PI / 2}
                t={go ? 1 : 0}
                w={A - B}
                h={B}
                color="#b8822c"
                label="$b(a-b)$"
              />
              {/* the removed b × b corner */}
              {!go && (
                <mesh position={[A - B / 2, A - B / 2, 0]}>
                  <boxGeometry args={[B, B, 0.4]} />
                  <meshBasicMaterial color="#ff6b7a" wireframe transparent opacity={0.6} />
                </mesh>
              )}
              {!go && <Label position={[A - B / 2, A - B / 2, 0.3]} text="$b^2$ محذوف" color="#ff6b7a" size="s" />}
              <Label position={[A / 2, -0.35, 0]} text={`$a=${tn(a)}$`} size="s" />
              {go && <Label position={[(A + B) / 2, -0.8, 0]} text={`العرض الجديد $a+b=${tn(a + bb)}$`} color="#5ee6b5" size="s" />}
              <Label position={[-0.75, (A - B) / 2, 0]} text={`$a-b=${tn(a - bb)}$`} size="s" />
            </group>
          ) : (
            <group position={[-(A + B) / 2, -(A + B) / 2, 0]}>
              <Slab w={A} h={A} pos={[A / 2, A / 2, 0]} color="#3d7fb8" label="$a^2$" depth={0.4} />
              <Slab w={B} h={B} pos={[A + B / 2 + (go ? 0.4 : 0), A + B / 2 + (go ? 0.4 : 0), 0]} color="#b8822c" label="$b^2$" depth={0.4} />
              <Slab w={B} h={A} pos={[A + B / 2 + (go ? 0.4 : 0), A / 2, 0]} color="#2f9c7a" label="$ab$" depth={0.4} />
              <Slab w={A} h={B} pos={[A / 2, A + B / 2 + (go ? 0.4 : 0), 0]} color="#2f9c7a" label="$ab$" depth={0.4} />
              <Label position={[(A + B) / 2, -0.35, 0]} text={`$a+b=${tn(a + bb)}$`} size="s" />
            </group>
          )}
        </>
      }
      readout={
        mode === 'diff' ? (
          <div className="readout-eq">
            <Tex tex={`a^2-b^2 = ${tn(a)}^2-${tn(bb)}^2 = ${tn(a * a)}-${tn(bb * bb)} = \\mathbf{${tn(a * a - bb * bb)}}`} block />
            <Tex tex={`(a-b)(a+b) = ${tn(a - bb)}\\times${tn(a + bb)} = \\mathbf{${tn((a - bb) * (a + bb))}}`} block />
            <p className="readout-note"><RichInline text={'اضغط «أعِد الترتيب»: الشريط البرتقالي ينتقل ويدور، فيتحول الشكل L إلى مستطيل $(a-b)\\times(a+b)$.'} /></p>
          </div>
        ) : (
          <div className="readout-eq">
            <Tex tex={`(a+b)^2 = ${tn(a + bb)}^2 = \\mathbf{${tn((a + bb) ** 2)}}`} block />
            <Tex tex={`a^2+2ab+b^2 = ${tn(a * a)} + ${tn(2 * a * bb)} + ${tn(bb * bb)} = \\mathbf{${tn(a * a + 2 * a * bb + bb * bb)}}`} block />
            <p className="readout-note"><RichInline text={'المربع الكبير يتكون من مربعين وقطعتين متطابقتين $ab$؛ لذلك يظهر الحد $2ab$.'} /></p>
          </div>
        )
      }
      controls={
        <>
          <Choice
            label="الصيغة"
            value={mode}
            onChange={(v) => {
              setMode(v);
              setGo(false);
            }}
            options={[
              { value: 'diff', label: '$a^2-b^2$' },
              { value: 'square', label: '$(a+b)^2$' },
            ]}
          />
          <Slider label="$a$" value={a} min={2} max={6} step={0.5} onChange={setA} />
          <Slider label="$b$" value={bb} min={0.5} max={a - 0.5} step={0.5} onChange={setB} />
          <Row>
            <Btn kind="primary" onClick={() => setGo((v) => !v)}>
              {mode === 'diff' ? (go ? 'أرجِع القطعة' : 'أعِد الترتيب') : go ? 'اجمع القطع' : 'فكّك المربع'}
            </Btn>
          </Row>
        </>
      }
    />
  );
}

/* ───────────────────────── 1.2 Laws of exponents ───────────────────────── */

function FactorCube({ pos, color, cancelled, label }: { pos: [number, number, number]; color: string; cancelled: boolean; label: string }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (!ref.current) return;
    const s = cancelled ? 0.35 : 1;
    const k = Math.min(1, dt * 5);
    ref.current.scale.x += (s - ref.current.scale.x) * k;
    ref.current.scale.y = ref.current.scale.z = ref.current.scale.x;
    ref.current.position.x += (pos[0] - ref.current.position.x) * k;
    ref.current.position.y += (pos[1] - ref.current.position.y) * k;
  });
  return (
    <group ref={ref} position={pos}>
      <RoundedBox args={[0.5, 0.5, 0.5]} radius={0.06}>
        <meshStandardMaterial color={cancelled ? '#ff6b7a' : color} transparent opacity={cancelled ? 0.35 : 0.95} emissive={color} emissiveIntensity={cancelled ? 0 : 0.25} />
      </RoundedBox>
      {!cancelled && <Label position={[0, 0, 0.3]} text={`$${label}$`} size="s" />}
    </group>
  );
}

export function ExponentLab() {
  const [mode, setMode] = useState<'prod' | 'quot' | 'pow'>('prod');
  const [m, setM] = useState(3);
  const [n, setN] = useState(-5);
  const [base, setBase] = useState(2);
  const [cancel, setCancel] = useState(true);

  const nn = mode === 'pow' ? Math.max(0, Math.min(3, n)) : n;
  const mm = mode === 'pow' ? Math.max(-3, Math.min(4, m)) : m;
  const result = mode === 'prod' ? mm + nn : mode === 'quot' ? mm - nn : mm * nn;

  // Build numerator / denominator factor lists. Colour shows which factor each cube came from.
  const num: string[] = [];
  const den: string[] = [];
  const push = (count: number, color: string) => {
    for (let i = 0; i < Math.abs(count); i++) (count > 0 ? num : den).push(color);
  };
  if (mode === 'pow') {
    const pal = ['#3d9ee0', '#e0a03d', '#3dbf8f'];
    for (let g = 0; g < nn; g++) push(mm, pal[g % 3]);
  } else {
    push(mm, '#3d9ee0');
    push(mode === 'prod' ? nn : -nn, '#e0a03d');
  }
  const pairs = Math.min(num.length, den.length);
  const row = (list: string[], y: number, isNum: boolean) =>
    list.map((c, i) => {
      const x = (i - (list.length - 1) / 2) * 0.62;
      return <FactorCube key={(isNum ? 'n' : 'd') + i} pos={[x, y, 0]} color={c} cancelled={cancel && i < pairs} label="a" />;
    });
  const width = Math.max(num.length, den.length, 3) * 0.62 + 1;
  const lhs =
    mode === 'prod' ? `a^{${mm}}\\cdot a^{${nn}}` : mode === 'quot' ? `\\dfrac{a^{${mm}}}{a^{${nn}}}` : `\\left(a^{${mm}}\\right)^{${nn}}`;
  const rule = mode === 'prod' ? `a^{${mm}+(${nn})}` : mode === 'quot' ? `a^{${mm}-(${nn})}` : `a^{${mm}\\cdot ${nn}}`;
  const pretty = result === 0 ? '1' : result > 0 ? `a^{${result}}` : `\\dfrac{1}{a^{${-result}}}`;
  const value = Math.pow(base, result);
  const valueTex = result === 0 ? `${base}^{0}` : result > 0 ? `${base}^{${result}}` : `\\dfrac{1}{${base}^{${-result}}}`;

  return (
    <LabShell
      scene={
        <>
          <FitCamera width={width} height={3.4} />
          <group>
            {row(num, 0.75, true)}
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[Math.max(width - 0.6, 1.5), 0.05, 0.05]} />
              <meshStandardMaterial color="#e9eef6" emissive="#e9eef6" emissiveIntensity={0.4} />
            </mesh>
            {den.length > 0 ? row(den, -0.75, false) : <Label position={[0, -0.7, 0]} text="$1$" size="m" />}
            {num.length === 0 && <Label position={[0, 0.7, 0]} text="$1$" size="m" />}
          </group>
        </>
      }
      readout={
        <div className="readout-eq">
          <Tex tex={`${lhs} = ${rule} = ${pretty}`} block />
          <Tex tex={`a=${base}:\\quad ${valueTex} = ${fmt(value, 5)}`} block />
          <p className="readout-note"><RichInline text={'كل مكعب = عامل $a$ واحد. فوق الخط = بسط، تحت الخط = مقام (الأس السالب ينقل العامل إلى المقام). كل مكعب فوق يلغي مكعبًا تحته لأن $\\frac{a}{a}=1$.'} /></p>
        </div>
      }
      controls={
        <>
          <Choice
            label="القانون"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'prod', label: '$a^m a^n$' },
              { value: 'quot', label: '$\\frac{a^m}{a^n}$' },
              { value: 'pow', label: '$(a^m)^n$' },
            ]}
          />
          <Slider label="$m$" value={mm} min={mode === 'pow' ? -3 : -5} max={mode === 'pow' ? 4 : 5} step={1} onChange={setM} />
          <Slider label="$n$" value={nn} min={mode === 'pow' ? 0 : -5} max={mode === 'pow' ? 3 : 5} step={1} onChange={setN} />
          <Choice label="قيمة $a$ للحساب" value={base} onChange={setBase} options={[2, 3, 10].map((v) => ({ value: v, label: `$${v}$` }))} />
          <Toggle label="أظهر الاختصار" checked={cancel} onChange={setCancel} />
        </>
      }
    />
  );
}
