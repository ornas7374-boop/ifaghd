import { Html, useTexture } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Suspense, useRef } from 'react';
import * as THREE from 'three';
import gridUrl from '../assets/grid-bg.jpg';
import { Tex } from '../components/Tex';
import { LESSONS } from '../content';
import { useProgress } from '../lib/progress';
import { Dust } from '../three/core';

const GLYPHS = ['f(x)', '\\mathbb{R}', '|x|', 'e^x', '\\ln x', '\\sin\\theta', 'a^2-b^2', '[a,b)', 'f^{-1}', '\\frac{f(a+h)-f(a)}{h}'];

function Portal({ entering }: { entering: boolean }) {
  const ring = useRef<THREE.Group>(null);
  const glyphs = useRef<THREE.Group>(null);
  const tex = useTexture(gridUrl);
  tex.colorSpace = THREE.SRGBColorSpace;
  const { camera, pointer } = useThree();
  const t0 = useRef<number | null>(null);
  useFrame(({ clock }, dt) => {
    if (ring.current) ring.current.rotation.z += dt * 0.15;
    if (glyphs.current) glyphs.current.rotation.y += dt * 0.12;
    if (entering) {
      if (t0.current === null) t0.current = clock.elapsedTime;
      const k = Math.min(1, (clock.elapsedTime - t0.current) / 0.9);
      camera.position.z = 9 - k * k * 9.5;
    } else {
      camera.position.x += (pointer.x * 0.8 - camera.position.x) * Math.min(1, dt * 2);
      camera.position.y += (pointer.y * 0.5 - camera.position.y) * Math.min(1, dt * 2);
    }
    camera.lookAt(0, 0, 0);
  });
  return (
    <group position={[0, 1.1, 0]} scale={0.92}>
      <group ref={ring}>
        <mesh>
          <torusGeometry args={[2.6, 0.06, 24, 160]} />
          <meshStandardMaterial color="#cfe9ff" emissive="#8fd3ff" emissiveIntensity={1.4} toneMapped={false} />
        </mesh>
        <mesh>
          <torusGeometry args={[2.95, 0.015, 12, 160]} />
          <meshBasicMaterial color="#8fd3ff" transparent opacity={0.5} />
        </mesh>
        {Array.from({ length: 24 }, (_, i) => {
          const a = (i / 24) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * 2.95, Math.sin(a) * 2.95, 0]}>
              <boxGeometry args={[0.04, 0.16, 0.04]} />
              <meshBasicMaterial color="#cfe9ff" />
            </mesh>
          );
        })}
      </group>
      <mesh position={[0, 0, -0.05]}>
        <circleGeometry args={[2.55, 64]} />
        <meshBasicMaterial map={tex} transparent opacity={0.9} />
      </mesh>
      <group ref={glyphs}>
        {GLYPHS.map((g, i) => {
          const a = (i / GLYPHS.length) * Math.PI * 2;
          const r = 4.1 + (i % 3) * 0.45;
          return (
            <Html key={g} position={[Math.cos(a) * r, Math.sin(i * 1.3) * 1.6, Math.sin(a) * r]} center zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
              <div className="glyph">
                <Tex tex={g} />
              </div>
            </Html>
          );
        })}
      </group>
      <pointLight position={[0, 0, 3]} intensity={30} color="#8fd3ff" distance={14} />
    </group>
  );
}

export function IntroView({ onEnter, onLesson, entering }: { onEnter: () => void; onLesson: (id: string) => void; entering: boolean }) {
  const { done, last } = useProgress();
  const resume = last ? LESSONS.find((l) => l.id === last) : undefined;
  return (
    <div className={`intro ${entering ? 'entering' : ''}`}>
      <div className="intro-bg" aria-hidden="true" />
      <Canvas className="intro-canvas" dpr={[1, 1.75]} gl={{ antialias: true, alpha: true }} camera={{ fov: 50, position: [0, 0, 9] }}>
        <ambientLight intensity={0.4} />
        <Suspense fallback={null}>
          <Portal entering={entering} />
        </Suspense>
        <Dust count={500} spread={30} />
      </Canvas>
      <div className="intro-copy">
        <p className="intro-eyebrow">MATH 1050 · التفاضل · الفصل الأول</p>
        <h1 className="intro-title">عالم الدوال الحقيقية</h1>
        <p className="intro-sub">
          من الأعداد الطبيعية إلى خارج قسمة الفروق: 20 درسًا تفاعليًا، كل معادلة فيها مختبر ثلاثي الأبعاد تغيّر قيمه وترى النتيجة فورًا.
        </p>
        <div className="intro-actions">
          <button type="button" className="btn btn-primary btn-lg" onClick={onEnter}>
            ادخل إلى الخريطة
          </button>
          {resume ? (
            <button type="button" className="btn btn-ghost btn-lg" onClick={() => onLesson(resume.id)}>
              تابع: {resume.title}
            </button>
          ) : (
            <button type="button" className="btn btn-ghost btn-lg" onClick={() => onLesson(LESSONS[0].id)}>
              ابدأ بالدرس الأول
            </button>
          )}
        </div>
        {done.length > 0 && (
          <p className="intro-progress">
            أنجزت {done.length} من {LESSONS.length} درسًا
          </p>
        )}
      </div>
    </div>
  );
}
