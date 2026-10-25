import { Html, OrbitControls } from '@react-three/drei';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { RichInline } from '../components/Tex';

export interface InfoCard {
  title: string;
  body: string;
}

export interface LabCtx {
  setInfo: (info: InfoCard | null) => void;
  viewKey: number;
}

export const LabContext = createContext<LabCtx>({ setInfo: () => {}, viewKey: 0 });
export const useLab = () => useContext(LabContext);

/**
 * Positions the camera so a box of width × height around `center` fills the view at any aspect ratio,
 * then hands control to orbit controls with gentle limits so nobody gets lost. Re-fits on resize and on
 * the shell's "reset view" button.
 */
export function FitCamera({
  width,
  height,
  center = [0, 0, 0],
  tilt = [0.22, 0.14],
  margin = 1.12,
  azimuth = 0.9,
  polar = [0.75, 2.05],
  pan = false,
}: {
  width: number;
  height: number;
  center?: [number, number, number];
  tilt?: [number, number];
  margin?: number;
  azimuth?: number;
  polar?: [number, number];
  pan?: boolean;
}) {
  const { camera, size } = useThree();
  const { viewKey } = useLab();
  const controls = useRef<OrbitControlsImpl>(null);
  const distRef = useRef(10);

  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const t = Math.tan((cam.fov * Math.PI) / 360);
    const aspect = size.width / Math.max(1, size.height);
    const d = Math.max(height / 2 / t, width / 2 / (t * aspect)) * margin;
    distRef.current = d;
    const c = new THREE.Vector3(...center);
    const dir = new THREE.Vector3(tilt[0], tilt[1], 1).normalize();
    cam.position.copy(c).addScaledVector(dir, d);
    cam.near = 0.1;
    cam.far = d * 12 + 100;
    cam.lookAt(c);
    cam.updateProjectionMatrix();
    if (controls.current) {
      controls.current.target.copy(c);
      controls.current.minDistance = d * 0.4;
      controls.current.maxDistance = d * 1.9;
      controls.current.update();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.width, size.height, viewKey, width, height, center[0], center[1], center[2]]);

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan={pan}
      enableDamping
      dampingFactor={0.08}
      minAzimuthAngle={-azimuth}
      maxAzimuthAngle={azimuth}
      minPolarAngle={polar[0]}
      maxPolarAngle={polar[1]}
      rotateSpeed={0.6}
      zoomSpeed={0.7}
    />
  );
}

export function Lights() {
  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[4, 8, 6]} intensity={1.4} />
      <pointLight position={[-6, 3, 4]} intensity={30} color="#8fd3ff" distance={30} />
    </>
  );
}

/** A DOM label pinned in 3D space. Ignores the pointer so orbiting still works through it. */
export function Label({
  position,
  text,
  color,
  className = '',
  size = 'm',
}: {
  position: [number, number, number];
  text: string;
  color?: string;
  className?: string;
  size?: 's' | 'm' | 'l';
}) {
  return (
    <Html position={position} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
      <div className={`lbl lbl-${size} ${className}`} style={color ? { color } : undefined}>
        <RichInline text={text} />
      </div>
    </Html>
  );
}

/** Wraps 3D objects so tapping them opens an explanation card in the lab. */
export function Hot({ info, children }: { info: InfoCard; children: ReactNode }) {
  const { setInfo } = useLab();
  return (
    <group
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        setInfo(info);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = '';
      }}
    >
      {children}
    </group>
  );
}

/** Slow ambient bobbing for decorative objects; disabled for reduced motion. */
export function Float({ children, speed = 1, amp = 0.08 }: { children: ReactNode; speed?: number; amp?: number }) {
  const g = useRef<THREE.Group>(null);
  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  useFrame(({ clock }) => {
    if (!g.current || reduce) return;
    g.current.position.y = Math.sin(clock.elapsedTime * speed) * amp;
  });
  return <group ref={g}>{children}</group>;
}

/** Faint drifting particles that give the scene depth without competing with the content. */
export function Dust({ count = 260, spread = 26 }: { count?: number; spread?: number }) {
  const ref = useRef<THREE.Points>(null);
  const geo = useRef<THREE.BufferGeometry>(null);
  useEffect(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * spread;
      arr[i * 3 + 1] = (Math.random() - 0.5) * spread * 0.6;
      arr[i * 3 + 2] = (Math.random() - 0.5) * spread - 4;
    }
    geo.current?.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  }, [count, spread]);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.012;
  });
  return (
    <points ref={ref}>
      <bufferGeometry ref={geo} />
      <pointsMaterial size={0.045} color="#bfe3ff" transparent opacity={0.55} sizeAttenuation depthWrite={false} />
    </points>
  );
}

/** Smoothly animates a number toward a target; returns a ref holding the current value. */
export function useTween(target: number, speed = 6) {
  const v = useRef(target);
  useFrame((_, dt) => {
    v.current += (target - v.current) * Math.min(1, dt * speed);
  });
  return v;
}
