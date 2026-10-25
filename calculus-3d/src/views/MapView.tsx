import { CatmullRomCurve3 } from 'three';
import { Html, OrbitControls, useTexture } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import gridUrl from '../assets/grid-bg.jpg';
import { LESSONS, SECTIONS, sectionOf } from '../content';
import type { Lesson, Section } from '../content/types';
import { useProgress } from '../lib/progress';
import { Dust } from '../three/core';

/** Lessons sit on a spiral path that winds inward to the practice hall at the centre. */
function layout() {
  const pts: THREE.Vector3[] = [];
  let theta = Math.PI * 0.62;
  const n = LESSONS.length;
  for (let k = 0; k < n; k++) {
    const r = 15.5 - (k / (n - 1)) * 8.3;
    pts.push(new THREE.Vector3(Math.cos(theta) * r, 0, Math.sin(theta) * r));
    theta += 3.9 / r;
  }
  return pts;
}

function Shape({ kind, color, hover }: { kind: Section['shape']; color: string; hover: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (!ref.current) return;
    ref.current.rotation.y += dt * (hover ? 1.6 : 0.45);
    ref.current.rotation.x += dt * 0.2;
    const s = hover ? 1.25 : 1;
    ref.current.scale.lerp(new THREE.Vector3(s, s, s), 0.15);
  });
  const geo = useMemo(() => {
    switch (kind) {
      case 'ico':
        return new THREE.IcosahedronGeometry(0.42, 0);
      case 'box':
        return new THREE.BoxGeometry(0.55, 0.55, 0.55);
      case 'oct':
        return new THREE.OctahedronGeometry(0.45, 0);
      case 'cap':
        return new THREE.CapsuleGeometry(0.2, 0.45, 6, 12);
      case 'cone':
        return new THREE.ConeGeometry(0.36, 0.7, 5);
      case 'torus':
        return new THREE.TorusGeometry(0.3, 0.11, 12, 32);
      default:
        return new THREE.TorusKnotGeometry(0.24, 0.08, 80, 10);
    }
  }, [kind]);
  return (
    <mesh ref={ref} geometry={geo} position={[0, 1.05, 0]}>
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={hover ? 0.9 : 0.45} metalness={0.3} roughness={0.3} toneMapped={false} />
    </mesh>
  );
}

function Station({ lesson, pos, index, done, onPick }: { lesson: Lesson; pos: THREE.Vector3; index: number; done: boolean; onPick: () => void }) {
  const sec = sectionOf(lesson);
  const [hover, setHover] = useState(false);
  return (
    <group
      position={pos}
      onClick={(e) => {
        e.stopPropagation();
        onPick();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHover(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHover(false);
        document.body.style.cursor = '';
      }}
    >
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.62, 0.72, 0.24, 32]} />
        <meshStandardMaterial color="#0d1626" metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.25, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.5, 0.6, 40]} />
        <meshBasicMaterial color={done ? '#ffd27a' : sec.color} transparent opacity={hover ? 1 : 0.75} />
      </mesh>
      {done && (
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.85, 0.95, 48]} />
          <meshBasicMaterial color="#ffd27a" transparent opacity={0.6} />
        </mesh>
      )}
      <Shape kind={sec.shape} color={sec.color} hover={hover} />
      <pointLight position={[0, 1.2, 0]} intensity={hover ? 6 : 2.5} distance={3.2} color={sec.color} />
      <Html position={[0, index % 2 ? 2.7 : 1.8, 0]} center zIndexRange={[30, 0]}>
        <button
          type="button"
          className={`station-label ${hover ? 'hover' : ''} ${done ? 'done' : ''}`}
          style={{ borderColor: sec.color }}
          onClick={onPick}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
        >
          <span className="station-n">{index + 1}</span>
          <span className="station-title">{lesson.title}</span>
          {done && <span className="station-check">✓</span>}
        </button>
      </Html>
    </group>
  );
}

function Floor() {
  const tex = useTexture(gridUrl);
  tex.colorSpace = THREE.SRGBColorSpace;
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
      <planeGeometry args={[46, 46 * (980 / 653)]} />
      <meshBasicMaterial map={tex} transparent opacity={0.95} />
    </mesh>
  );
}

function PathTube({ pts }: { pts: THREE.Vector3[] }) {
  const geo = useMemo(() => {
    const full = [...pts, new THREE.Vector3(0, 0, 0)].map((p) => p.clone().setY(0.03));
    return new THREE.TubeGeometry(new CatmullRomCurve3(full), 400, 0.05, 6, false);
  }, [pts]);
  return (
    <mesh geometry={geo}>
      <meshBasicMaterial color="#8fd3ff" transparent opacity={0.45} />
    </mesh>
  );
}

function PracticeHall({ onPick }: { onPick: () => void }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.25;
  });
  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        onPick();
      }}
      onPointerOver={() => (document.body.style.cursor = 'pointer')}
      onPointerOut={() => (document.body.style.cursor = '')}
    >
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[1.6, 1.9, 0.4, 48]} />
        <meshStandardMaterial color="#0d1626" metalness={0.6} roughness={0.3} />
      </mesh>
      <group ref={ref} position={[0, 1.7, 0]}>
        <mesh>
          <dodecahedronGeometry args={[0.75, 0]} />
          <meshStandardMaterial color="#e9eef6" emissive="#bfe3ff" emissiveIntensity={0.5} wireframe />
        </mesh>
        <mesh>
          <icosahedronGeometry args={[0.45, 0]} />
          <meshStandardMaterial color="#ffd27a" emissive="#ffb547" emissiveIntensity={0.7} toneMapped={false} />
        </mesh>
      </group>
      <pointLight position={[0, 2, 0]} intensity={12} distance={6} color="#ffd27a" />
      <Html position={[0, 3.1, 0]} center zIndexRange={[30, 0]}>
        <button type="button" className="station-label hall" onClick={onPick}>
          قاعة التدريب
          <small>30 مسألة + 24 تمرين مراجعة</small>
        </button>
      </Html>
    </group>
  );
}

interface Fly {
  target: THREE.Vector3;
  cam: THREE.Vector3;
}

function Rig({ fly, setFly }: { fly: Fly | null; setFly: (f: Fly | null) => void }) {
  const controls = useRef<OrbitControlsImpl>(null);
  const { camera, size } = useThree();
  useEffect(() => {
    const narrow = size.width / size.height < 0.9;
    camera.position.set(0, narrow ? 44 : 31, narrow ? 29 : 22);
    controls.current?.target.set(0, 0, 3);
    controls.current?.update();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    const stop = () => setFly(null);
    c.addEventListener('start', stop);
    return () => c.removeEventListener('start', stop);
  }, [setFly]);
  useFrame((_, dt) => {
    if (!fly || !controls.current) return;
    const k = Math.min(1, dt * 3);
    controls.current.target.lerp(fly.target, k);
    camera.position.lerp(fly.cam, k);
    controls.current.update();
    if (camera.position.distanceTo(fly.cam) < 0.05) setFly(null);
  });
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      maxPolarAngle={1.28}
      minDistance={5}
      maxDistance={56}
      screenSpacePanning={false}
    />
  );
}

export function MapView({ onLesson, onPractice }: { onLesson: (id: string) => void; onPractice: () => void }) {
  const pts = useMemo(layout, []);
  const { done, last } = useProgress();
  const [fly, setFly] = useState<Fly | null>(null);
  const flyTo = (p: THREE.Vector3, dist = 7) => {
    const out = p.clone().setY(0).normalize();
    if (out.lengthSq() < 0.01) out.set(0, 0, 1);
    setFly({ target: p.clone(), cam: p.clone().addScaledVector(out, dist * 0.8).add(new THREE.Vector3(0, dist * 0.75, 0)) });
  };
  const pick = (i: number) => {
    flyTo(pts[i], 5);
    window.setTimeout(() => onLesson(LESSONS[i].id), 520);
  };
  const nextIdx = Math.max(0, LESSONS.findIndex((l) => !done.includes(l.id)));
  const resumeIdx = last ? LESSONS.findIndex((l) => l.id === last) : -1;

  return (
    <div className="map">
      <Canvas dpr={[1, 1.75]} gl={{ antialias: true, alpha: true }} camera={{ fov: 45, position: [0, 31, 19] }}>
        <fog attach="fog" args={['#04060a', 30, 80]} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[8, 14, 6]} intensity={1.2} />
        <Suspense fallback={null}>
          <Floor />
        </Suspense>
        <Dust count={420} spread={46} />
        <PathTube pts={pts} />
        {LESSONS.map((l, i) => (
          <Station key={l.id} lesson={l} pos={pts[i]} index={i} done={done.includes(l.id)} onPick={() => pick(i)} />
        ))}
        <PracticeHall
          onPick={() => {
            flyTo(new THREE.Vector3(0, 0, 0), 6);
            window.setTimeout(onPractice, 520);
          }}
        />
        <Rig fly={fly} setFly={setFly} />
      </Canvas>

      <div className="map-panel">
        <h1>خريطة الفصل الأول</h1>
        <p>
          21 محطة على مسار حلزوني ينتهي في قاعة التدريب. اسحب للتجول، كبّر بالعجلة أو بإصبعين، واضغط أي محطة لدخولها مباشرة. الترتيب
          مقترح فقط: ادخل أي درس تريده.
        </p>
        <div className="map-actions">
          <button type="button" className="btn btn-primary" onClick={() => onLesson(LESSONS[resumeIdx >= 0 ? resumeIdx : nextIdx].id)}>
            {resumeIdx >= 0 ? `تابع: ${LESSONS[resumeIdx].title}` : `ابدأ: ${LESSONS[nextIdx].title}`}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => setFly({ target: new THREE.Vector3(0, 0, 3), cam: new THREE.Vector3(0, 31, 22) })}>
            ⟲ المنظر الكامل
          </button>
        </div>
        <div className="legend" aria-label="الأقسام">
          {SECTIONS.map((s) => {
            const first = LESSONS.findIndex((l) => l.section === s.id);
            const count = LESSONS.filter((l) => l.section === s.id).length;
            const got = LESSONS.filter((l) => l.section === s.id && done.includes(l.id)).length;
            return (
              <button key={s.id} type="button" className="legend-item" onClick={() => flyTo(pts[first], 9)}>
                <span className="dot" style={{ background: s.color }} />
                <span className="legend-id">{s.id}</span>
                <span className="legend-title">{s.title}</span>
                <span className="legend-count">
                  {got}/{count}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
