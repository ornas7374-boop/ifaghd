import { Line } from '@react-three/drei';
import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import * as THREE from 'three';
import { fmt } from '../lib/text';
import { Label } from './core';

export type Fn = (x: number) => number;

export interface PlotCtx {
  xr: [number, number];
  yr: [number, number];
  w: number;
  h: number;
  X: (x: number) => number;
  Y: (y: number) => number;
  axisY: number; // data y where the x-axis is drawn
  axisX: number; // data x where the y-axis is drawn
}

const Ctx = createContext<PlotCtx | null>(null);
export function usePlot() {
  const c = useContext(Ctx);
  if (!c) throw new Error('usePlot outside Plot3D');
  return c;
}

/** Exact polyline (no spline overshoot at corners like |x|). */
class Polyline extends THREE.Curve<THREE.Vector3> {
  pts: THREE.Vector3[];
  constructor(pts: THREE.Vector3[]) {
    super();
    this.pts = pts;
  }
  getPoint(t: number, target = new THREE.Vector3()) {
    const n = this.pts.length - 1;
    const f = Math.min(Math.max(t, 0), 1) * n;
    const i = Math.min(Math.floor(f), n - 1);
    return target.copy(this.pts[i]).lerp(this.pts[i + 1], f - i);
  }
}

export function Tube({
  pts,
  color,
  radius = 0.05,
  opacity = 1,
  glow = 0.6,
}: {
  pts: THREE.Vector3[];
  color: string;
  radius?: number;
  opacity?: number;
  glow?: number;
}) {
  const geo = useMemo(
    () => (pts.length >= 2 ? new THREE.TubeGeometry(new Polyline(pts), Math.min(600, pts.length * 2), radius, 8, false) : null),
    [pts, radius],
  );
  useEffect(() => () => geo?.dispose(), [geo]);
  if (!geo) return null;
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={glow}
        roughness={0.35}
        metalness={0.1}
        transparent={opacity < 1}
        opacity={opacity}
        toneMapped={false}
      />
    </mesh>
  );
}

function niceStep(span: number, target = 10) {
  const raw = span / target;
  const steps = [0.25, 0.5, 1, 2, 5, 10, 20, 50, 100];
  return steps.find((s) => s >= raw) ?? 100;
}

export interface Tick {
  v: number;
  label: string;
}

export function Plot3D({
  x,
  y,
  width = 8,
  height = 5,
  children,
  xTicks,
  yTicks,
  xLabel = 'x',
  yLabel = 'y',
  board = true,
}: {
  x: [number, number];
  y: [number, number];
  width?: number;
  height?: number;
  children?: ReactNode;
  xTicks?: Tick[];
  yTicks?: Tick[];
  xLabel?: string;
  yLabel?: string;
  board?: boolean;
}) {
  const ctx = useMemo<PlotCtx>(() => {
    const sx = width / (x[1] - x[0]);
    const sy = height / (y[1] - y[0]);
    const cx = (x[0] + x[1]) / 2;
    const cy = (y[0] + y[1]) / 2;
    return {
      xr: x,
      yr: y,
      w: width,
      h: height,
      X: (v) => (v - cx) * sx,
      Y: (v) => (v - cy) * sy,
      axisY: y[0] <= 0 && y[1] >= 0 ? 0 : y[0],
      axisX: x[0] <= 0 && x[1] >= 0 ? 0 : x[0],
    };
  }, [x[0], x[1], y[0], y[1], width, height]);

  const xs = xTicks ?? autoTicks(x);
  const ys = yTicks ?? autoTicks(y);

  const grid = useMemo(() => {
    const arr: number[] = [];
    const gx = niceStep(x[1] - x[0], 16);
    const gy = niceStep(y[1] - y[0], 12);
    for (let v = Math.ceil(x[0] / gx) * gx; v <= x[1] + 1e-9; v += gx) arr.push(ctx.X(v), ctx.Y(y[0]), -0.02, ctx.X(v), ctx.Y(y[1]), -0.02);
    for (let v = Math.ceil(y[0] / gy) * gy; v <= y[1] + 1e-9; v += gy) arr.push(ctx.X(x[0]), ctx.Y(v), -0.02, ctx.X(x[1]), ctx.Y(v), -0.02);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
    return g;
  }, [ctx]);
  useEffect(() => () => grid.dispose(), [grid]);

  const ax = ctx.Y(ctx.axisY);
  const ay = ctx.X(ctx.axisX);
  const L = width / 2 + 0.25;
  const H = height / 2 + 0.25;

  return (
    <Ctx.Provider value={ctx}>
      <group>
        {board && (
          <mesh position={[0, 0, -0.08]}>
            <boxGeometry args={[width + 0.9, height + 0.9, 0.06]} />
            <meshStandardMaterial color="#0a1220" transparent opacity={0.62} roughness={0.85} metalness={0.2} />
          </mesh>
        )}
        <lineSegments geometry={grid}>
          <lineBasicMaterial color="#5f86b3" transparent opacity={0.22} />
        </lineSegments>
        {/* x axis */}
        <mesh position={[0, ax, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.018, 0.018, width + 0.5, 8]} />
          <meshStandardMaterial color="#c9d6e8" />
        </mesh>
        <mesh position={[L, ax, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[0.07, 0.22, 12]} />
          <meshStandardMaterial color="#c9d6e8" />
        </mesh>
        {/* y axis */}
        <mesh position={[ay, 0, 0]}>
          <cylinderGeometry args={[0.018, 0.018, height + 0.5, 8]} />
          <meshStandardMaterial color="#c9d6e8" />
        </mesh>
        <mesh position={[ay, H, 0]}>
          <coneGeometry args={[0.07, 0.22, 12]} />
          <meshStandardMaterial color="#c9d6e8" />
        </mesh>
        <Label position={[L + 0.3, ax, 0]} text={`$${xLabel}$`} size="s" className="lbl-axis" />
        <Label position={[ay, H + 0.32, 0]} text={`$${yLabel}$`} size="s" className="lbl-axis" />
        {xs.map((t) =>
          Math.abs(t.v - ctx.axisX) < 1e-9 && ctx.axisY === 0 && t.label === '0' ? null : (
            <group key={'x' + t.v}>
              <mesh position={[ctx.X(t.v), ax, 0]}>
                <boxGeometry args={[0.02, 0.14, 0.02]} />
                <meshBasicMaterial color="#c9d6e8" />
              </mesh>
              <Label position={[ctx.X(t.v), ax - 0.28, 0]} text={t.label} size="s" className="lbl-tick" />
            </group>
          ),
        )}
        {ys.map((t) =>
          Math.abs(t.v - ctx.axisY) < 1e-9 ? null : (
            <group key={'y' + t.v}>
              <mesh position={[ay, ctx.Y(t.v), 0]}>
                <boxGeometry args={[0.14, 0.02, 0.02]} />
                <meshBasicMaterial color="#c9d6e8" />
              </mesh>
              <Label position={[ay - 0.3, ctx.Y(t.v), 0]} text={t.label} size="s" className="lbl-tick" />
            </group>
          ),
        )}
        {ctx.axisX === 0 && ctx.axisY === 0 && <Label position={[ctx.X(0) - 0.2, ctx.Y(0) - 0.26, 0]} text="0" size="s" className="lbl-tick" />}
        {children}
      </group>
    </Ctx.Provider>
  );
}

function autoTicks(r: [number, number]): Tick[] {
  const step = niceStep(r[1] - r[0], 8);
  const out: Tick[] = [];
  for (let v = Math.ceil(r[0] / step) * step; v <= r[1] + 1e-9; v += step) {
    const vv = Math.round(v * 1000) / 1000;
    if (Math.abs(vv - r[0]) < 1e-9 || Math.abs(vv - r[1]) < 1e-9) continue;
    out.push({ v: vv, label: fmt(vv) });
  }
  return out;
}

/** Samples fn into drawable pieces, breaking at gaps, asymptotes and where the graph leaves the box. */
export function samplePieces(
  fn: Fn,
  ctx: PlotCtx,
  domain?: [number, number],
  n = 420,
  z = 0,
): { pts: THREE.Vector3[]; xs: number[] }[] {
  const x0 = Math.max(ctx.xr[0], domain ? domain[0] : -Infinity);
  const x1 = Math.min(ctx.xr[1], domain ? domain[1] : Infinity);
  if (!(x1 > x0)) return [];
  const [y0, y1] = ctx.yr;
  const span = y1 - y0;
  const pieces: { pts: THREE.Vector3[]; xs: number[] }[] = [];
  let cur: { pts: THREE.Vector3[]; xs: number[] } | null = null;
  let prev: { x: number; y: number; inside: boolean } | null = null;
  const clampY = (v: number) => Math.min(y1 + span * 0.02, Math.max(y0 - span * 0.02, v));
  for (let i = 0; i <= n; i++) {
    const xv = x0 + ((x1 - x0) * i) / n;
    const yv = fn(xv);
    const finite = Number.isFinite(yv);
    const inside = finite && yv >= y0 - span * 0.02 && yv <= y1 + span * 0.02;
    const jump = prev && finite && Number.isFinite(prev.y) && Math.abs(yv - prev.y) > span * 0.7;
    if (jump && cur) {
      if (cur.pts.length >= 2) pieces.push(cur);
      cur = null;
    }
    if (inside) {
      if (!cur) {
        cur = { pts: [], xs: [] };
        if (prev && !prev.inside && Number.isFinite(prev.y) && !jump) {
          cur.pts.push(new THREE.Vector3(ctx.X(prev.x), ctx.Y(clampY(prev.y)), z));
          cur.xs.push(prev.x);
        }
      }
      cur.pts.push(new THREE.Vector3(ctx.X(xv), ctx.Y(yv), z));
      cur.xs.push(xv);
    } else if (cur) {
      if (finite && !jump) {
        cur.pts.push(new THREE.Vector3(ctx.X(xv), ctx.Y(clampY(yv)), z));
        cur.xs.push(xv);
      }
      if (cur.pts.length >= 2) pieces.push(cur);
      cur = null;
    }
    prev = { x: xv, y: yv, inside };
  }
  if (cur && cur.pts.length >= 2) pieces.push(cur);
  return pieces;
}

export function PlotCurve({
  fn,
  color,
  domain,
  radius = 0.05,
  opacity = 1,
  colorAt,
  samples = 420,
  z = 0,
}: {
  fn: Fn;
  color: string;
  domain?: [number, number];
  radius?: number;
  opacity?: number;
  /** Optional per-point colouring; the curve is split wherever the colour changes. */
  colorAt?: (x: number, y: number) => string;
  samples?: number;
  z?: number;
}) {
  const ctx = usePlot();
  const parts = useMemo(() => {
    const pieces = samplePieces(fn, ctx, domain, samples, z);
    if (!colorAt) return pieces.map((p) => ({ pts: p.pts, color }));
    const out: { pts: THREE.Vector3[]; color: string }[] = [];
    for (const p of pieces) {
      let curColor = colorAt(p.xs[0], fn(p.xs[0]));
      let cur: THREE.Vector3[] = [p.pts[0]];
      for (let i = 1; i < p.pts.length; i++) {
        const c = colorAt(p.xs[i], fn(p.xs[i]));
        cur.push(p.pts[i]);
        if (c !== curColor) {
          if (cur.length >= 2) out.push({ pts: cur, color: curColor });
          cur = [p.pts[i]];
          curColor = c;
        }
      }
      if (cur.length >= 2) out.push({ pts: cur, color: curColor });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fn, ctx, domain?.[0], domain?.[1], color, colorAt, samples, z]);
  return (
    <>
      {parts.map((p, i) => (
        <Tube key={i} pts={p.pts} color={p.color} radius={radius} opacity={opacity} />
      ))}
    </>
  );
}

export function PlotPoint({
  x,
  y,
  color = '#ffb547',
  open = false,
  label,
  size = 1,
  labelOffset = [0, 0.38],
}: {
  x: number;
  y: number;
  color?: string;
  open?: boolean;
  label?: string;
  size?: number;
  labelOffset?: [number, number];
}) {
  const ctx = usePlot();
  if (!Number.isFinite(y) || !Number.isFinite(x)) return null;
  const X = ctx.X(x);
  const Y = ctx.Y(y);
  return (
    <group>
      {open ? (
        <mesh position={[X, Y, 0]}>
          <torusGeometry args={[0.11 * size, 0.035 * size, 10, 28]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} toneMapped={false} />
        </mesh>
      ) : (
        <mesh position={[X, Y, 0]}>
          <sphereGeometry args={[0.12 * size, 20, 20]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.7} toneMapped={false} />
        </mesh>
      )}
      {label && <Label position={[X + labelOffset[0], Y + labelOffset[1], 0]} text={label} size="s" color={color} />}
    </group>
  );
}

export function PlotSegment({
  from,
  to,
  color = '#ffffff',
  dashed = false,
  width = 2,
  opacity = 1,
}: {
  from: [number, number];
  to: [number, number];
  color?: string;
  dashed?: boolean;
  width?: number;
  opacity?: number;
}) {
  const ctx = usePlot();
  return (
    <Line
      points={[
        [ctx.X(from[0]), ctx.Y(from[1]), 0.01],
        [ctx.X(to[0]), ctx.Y(to[1]), 0.01],
      ]}
      color={color}
      lineWidth={width}
      dashed={dashed}
      dashSize={0.14}
      gapSize={0.1}
      transparent
      opacity={opacity}
    />
  );
}

export function PlotVLine({ x, color = '#ffffff', dashed = true, width = 2 }: { x: number; color?: string; dashed?: boolean; width?: number }) {
  const ctx = usePlot();
  if (x < ctx.xr[0] || x > ctx.xr[1]) return null;
  return <PlotSegment from={[x, ctx.yr[0]]} to={[x, ctx.yr[1]]} color={color} dashed={dashed} width={width} />;
}

export function PlotHLine({ y, color = '#ffffff', dashed = true, width = 2 }: { y: number; color?: string; dashed?: boolean; width?: number }) {
  const ctx = usePlot();
  if (y < ctx.yr[0] || y > ctx.yr[1]) return null;
  return <PlotSegment from={[ctx.xr[0], y]} to={[ctx.xr[1], y]} color={color} dashed={dashed} width={width} />;
}

/** Translucent vertical slab marking an x-range (e.g. a solution set). */
export function PlotRegion({ from, to, color = '#5fe3a1', opacity = 0.13 }: { from: number; to: number; color?: string; opacity?: number }) {
  const ctx = usePlot();
  const a = Math.max(from, ctx.xr[0]);
  const b = Math.min(to, ctx.xr[1]);
  if (!(b > a)) return null;
  const w = ctx.X(b) - ctx.X(a);
  return (
    <mesh position={[(ctx.X(a) + ctx.X(b)) / 2, 0, -0.03]}>
      <planeGeometry args={[w, ctx.h]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  );
}

/** Glowing bar lying on the x-axis (or y-axis) for a set of values, with open/closed ends. */
export function PlotAxisBand({
  from,
  to,
  color = '#5fe3a1',
  closedFrom = true,
  closedTo = true,
  axis = 'x',
}: {
  from: number;
  to: number;
  color?: string;
  closedFrom?: boolean;
  closedTo?: boolean;
  axis?: 'x' | 'y';
}) {
  const ctx = usePlot();
  const r = axis === 'x' ? ctx.xr : ctx.yr;
  const a = Math.max(from, r[0]);
  const b = Math.min(to, r[1]);
  if (b < a) return null;
  const P = (v: number): [number, number, number] =>
    axis === 'x' ? [ctx.X(v), ctx.Y(ctx.axisY), 0.05] : [ctx.X(ctx.axisX), ctx.Y(v), 0.05];
  const pa = P(a);
  const pb = P(b);
  const len = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]);
  const mid: [number, number, number] = [(pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2, 0.05];
  return (
    <group>
      {len > 0.001 && (
        <mesh position={mid} rotation={[0, 0, axis === 'x' ? Math.PI / 2 : 0]}>
          <cylinderGeometry args={[0.065, 0.065, len, 12]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.7} transparent opacity={0.85} toneMapped={false} />
        </mesh>
      )}
      {Number.isFinite(from) && from >= r[0] && <EndCap at={pa} closed={closedFrom} color={color} />}
      {Number.isFinite(to) && to <= r[1] && <EndCap at={pb} closed={closedTo} color={color} />}
    </group>
  );
}

function EndCap({ at, closed, color }: { at: [number, number, number]; closed: boolean; color: string }) {
  return closed ? (
    <mesh position={at}>
      <sphereGeometry args={[0.13, 18, 18]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} toneMapped={false} />
    </mesh>
  ) : (
    <mesh position={at}>
      <torusGeometry args={[0.12, 0.035, 10, 28]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} toneMapped={false} />
    </mesh>
  );
}

export function PlotText({ x, y, text, color, size = 's' }: { x: number; y: number; text: string; color?: string; size?: 's' | 'm' | 'l' }) {
  const ctx = usePlot();
  return <Label position={[ctx.X(x), ctx.Y(y), 0.05]} text={text} color={color} size={size} />;
}

/** π-based ticks for trig plots. */
export function piTicks(from: number, to: number, stepFrac = 0.5): Tick[] {
  const out: Tick[] = [];
  const names: Record<string, string> = {
    '-2': '$-2\\pi$', '-1.5': '$-\\frac{3\\pi}{2}$', '-1': '$-\\pi$', '-0.5': '$-\\frac{\\pi}{2}$',
    '0.5': '$\\frac{\\pi}{2}$', '1': '$\\pi$', '1.5': '$\\frac{3\\pi}{2}$', '2': '$2\\pi$', '2.5': '$\\frac{5\\pi}{2}$', '3': '$3\\pi$',
  };
  for (let k = Math.ceil(from / (stepFrac * Math.PI)); k * stepFrac * Math.PI <= to; k++) {
    const m = k * stepFrac;
    if (m === 0) continue;
    out.push({ v: m * Math.PI, label: names[String(m)] ?? `${m}\\pi` });
  }
  return out;
}

/** Parametric curve t ↦ (x(t), y(t)); used for inverses, circles and sideways parabolas. */
export function PlotParam({
  fx,
  fy,
  t,
  color,
  radius = 0.05,
  opacity = 1,
  n = 360,
}: {
  fx: Fn;
  fy: Fn;
  t: [number, number];
  color: string;
  radius?: number;
  opacity?: number;
  n?: number;
}) {
  const ctx = usePlot();
  const pieces = useMemo(() => {
    const out: THREE.Vector3[][] = [];
    let cur: THREE.Vector3[] = [];
    const [x0, x1] = ctx.xr;
    const [y0, y1] = ctx.yr;
    for (let i = 0; i <= n; i++) {
      const tv = t[0] + ((t[1] - t[0]) * i) / n;
      const xv = fx(tv);
      const yv = fy(tv);
      const ok = Number.isFinite(xv) && Number.isFinite(yv) && xv >= x0 && xv <= x1 && yv >= y0 && yv <= y1;
      if (ok) cur.push(new THREE.Vector3(ctx.X(xv), ctx.Y(yv), 0));
      else if (cur.length) {
        if (cur.length >= 2) out.push(cur);
        cur = [];
      }
    }
    if (cur.length >= 2) out.push(cur);
    return out;
  }, [fx, fy, t[0], t[1], ctx, n]);
  return (
    <>
      {pieces.map((p, i) => (
        <Tube key={i} pts={p} color={color} radius={radius} opacity={opacity} />
      ))}
    </>
  );
}
