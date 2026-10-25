import { useFrame } from '@react-three/fiber';
import { createContext, useContext, useMemo, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { fmt } from '../lib/text';
import { Hot, Label } from './core';

interface NLCtx {
  X: (x: number) => number;
  range: [number, number];
  width: number;
}
const Ctx = createContext<NLCtx | null>(null);
export const useNL = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useNL outside NumberLine3D');
  return c;
};

/** A real line built as a solid rail, with ticks and labels; children add intervals and points. */
export function NumberLine3D({
  range,
  width = 10,
  step = 1,
  labelEvery = 1,
  children,
  y = 0,
  tickLabels,
}: {
  range: [number, number];
  width?: number;
  step?: number;
  labelEvery?: number;
  children?: ReactNode;
  y?: number;
  tickLabels?: { v: number; label: string }[];
}) {
  const ctx = useMemo<NLCtx>(() => {
    const s = width / (range[1] - range[0]);
    const c = (range[0] + range[1]) / 2;
    return { X: (v) => (v - c) * s, range, width };
  }, [range[0], range[1], width]);

  const ticks: number[] = [];
  for (let v = Math.ceil(range[0] / step) * step; v <= range[1] + 1e-9; v += step) ticks.push(Math.round(v * 1000) / 1000);
  const half = width / 2 + 0.45;

  return (
    <Ctx.Provider value={ctx}>
      <group position={[0, y, 0]}>
        <Hot
          info={{
            title: 'خط الأعداد الحقيقية',
            body: 'كل نقطة على هذا الخط تقابل **عددًا حقيقيًا واحدًا** بالضبط، وكل عدد حقيقي له نقطة واحدة. اليمين = أكبر، واليسار = أصغر (على المحور الرياضي يتجه الموجب يمينًا دائمًا حتى لو كانت الصفحة عربية).',
          }}
        >
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.035, 0.035, width + 0.9, 12]} />
            <meshStandardMaterial color="#cfdcee" metalness={0.3} roughness={0.4} />
          </mesh>
        </Hot>
        <mesh position={[half, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[0.1, 0.3, 16]} />
          <meshStandardMaterial color="#cfdcee" />
        </mesh>
        <mesh position={[-half, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <coneGeometry args={[0.1, 0.3, 16]} />
          <meshStandardMaterial color="#cfdcee" />
        </mesh>
        {ticks.map((t, i) => (
          <group key={t}>
            <mesh position={[ctx.X(t), 0, 0]}>
              <boxGeometry args={[0.025, 0.22, 0.025]} />
              <meshBasicMaterial color="#cfdcee" />
            </mesh>
            {!tickLabels && i % labelEvery === 0 && (
              <Label position={[ctx.X(t), -0.42, 0]} text={fmt(t)} size="s" className="lbl-tick" />
            )}
          </group>
        ))}
        {tickLabels?.map((t) => <Label key={t.v} position={[ctx.X(t.v), -0.42, 0]} text={t.label} size="s" className="lbl-tick" />)}
        {children}
      </group>
    </Ctx.Provider>
  );
}

/** Animated lift so intervals glide when values change. */
function useSmooth(v: number) {
  const r = useRef(v);
  useFrame((_, dt) => {
    r.current += (v - r.current) * Math.min(1, dt * 8);
  });
  return r;
}

export function NLInterval({
  from,
  to,
  closedFrom,
  closedTo,
  color,
  lift = 0,
  label,
  radius = 0.07,
}: {
  from: number;
  to: number;
  closedFrom: boolean;
  closedTo: boolean;
  color: string;
  lift?: number;
  label?: string;
  radius?: number;
}) {
  const { X, range } = useNL();
  const g = useRef<THREE.Group>(null);
  const ly = useSmooth(lift);
  useFrame(() => {
    if (g.current) g.current.position.y = ly.current;
  });
  const edgeL = range[0] - (range[1] - range[0]) * 0.035;
  const edgeR = range[1] + (range[1] - range[0]) * 0.035;
  const a = Number.isFinite(from) ? Math.max(from, edgeL) : edgeL;
  const b = Number.isFinite(to) ? Math.min(to, edgeR) : edgeR;
  if (b < a) return null;
  const len = X(b) - X(a);
  return (
    <group ref={g}>
      {len > 0.0001 && (
        <mesh position={[(X(a) + X(b)) / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[radius, radius, len, 16]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.55} transparent opacity={0.9} toneMapped={false} />
        </mesh>
      )}
      {!Number.isFinite(from) && (
        <mesh position={[X(a) - 0.12, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <coneGeometry args={[radius * 2.2, 0.32, 16]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} toneMapped={false} />
        </mesh>
      )}
      {!Number.isFinite(to) && (
        <mesh position={[X(b) + 0.12, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[radius * 2.2, 0.32, 16]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} toneMapped={false} />
        </mesh>
      )}
      {Number.isFinite(from) && from >= range[0] && <NLEnd x={X(from)} closed={closedFrom} color={color} />}
      {Number.isFinite(to) && to <= range[1] && <NLEnd x={X(to)} closed={closedTo} color={color} />}
      {label && <Label position={[(X(a) + X(b)) / 2, 0.42, 0]} text={label} color={color} size="s" />}
    </group>
  );
}

function NLEnd({ x, closed, color }: { x: number; closed: boolean; color: string }) {
  return (
    <Hot
      info={
        closed
          ? { title: 'دائرة مُصمتة ●', body: 'الطرف **داخل** المجموعة. نستخدمها مع $\\le$ أو $\\ge$ ومع القوس المربع $[\\,]$.' }
          : { title: 'دائرة مفتوحة ○', body: 'الطرف **خارج** المجموعة: نقترب منه كما نشاء لكن لا نصل إليه. نستخدمها مع $<$ أو $>$ ومع القوس العادي $(\\,)$.' }
      }
    >
      {closed ? (
        <mesh position={[x, 0, 0]}>
          <sphereGeometry args={[0.17, 22, 22]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} toneMapped={false} />
        </mesh>
      ) : (
        <mesh position={[x, 0, 0]}>
          <torusGeometry args={[0.15, 0.045, 12, 32]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} toneMapped={false} />
        </mesh>
      )}
    </Hot>
  );
}

export function NLPoint({
  x,
  color = '#ffb547',
  label,
  lift = 0,
  above = true,
  size = 1,
}: {
  x: number;
  color?: string;
  label?: string;
  lift?: number;
  above?: boolean;
  size?: number;
}) {
  const { X } = useNL();
  const g = useRef<THREE.Group>(null);
  const sx = useSmooth(X(x));
  const ly = useSmooth(lift);
  useFrame(() => {
    if (g.current) g.current.position.set(sx.current, ly.current, 0);
  });
  return (
    <group ref={g}>
      <mesh>
        <sphereGeometry args={[0.16 * size, 22, 22]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.75} toneMapped={false} />
      </mesh>
      {label && <Label position={[0, above ? 0.45 : -0.75, 0]} text={label} color={color} size="s" />}
    </group>
  );
}

/** A labelled sign (+ / −) hovering over a stretch of the line, used for sign diagrams. */
export function NLSign({ x, sign, lift = 0.55 }: { x: number; sign: '+' | '-' | '0'; lift?: number }) {
  const { X } = useNL();
  const color = sign === '+' ? '#5fe3a1' : sign === '-' ? '#ff6b7a' : '#cfdcee';
  return <Label position={[X(x), lift, 0]} text={sign === '-' ? '−' : sign} color={color} size="l" className="lbl-sign" />;
}

/** Double-headed distance arrow between two values, floating above the line. */
export function NLSpan({ from, to, lift = 0.7, color = '#8fd3ff', label }: { from: number; to: number; lift?: number; color?: string; label?: string }) {
  const { X } = useNL();
  const a = X(Math.min(from, to));
  const b = X(Math.max(from, to));
  const len = b - a;
  if (len < 0.01) return null;
  return (
    <group position={[0, lift, 0]}>
      <mesh position={[(a + b) / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.022, 0.022, Math.max(0.01, len - 0.3), 8]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh position={[a + 0.1, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <coneGeometry args={[0.07, 0.2, 12]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh position={[b - 0.1, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.07, 0.2, 12]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {label && <Label position={[(a + b) / 2, 0.32, 0]} text={label} color={color} size="s" />}
    </group>
  );
}
