import { Canvas } from '@react-three/fiber';
import { useEffect, useState, type ReactNode } from 'react';
import { Dust, LabContext, Lights, type InfoCard } from '../three/core';
import { Rich, RichInline } from './Tex';

/**
 * Frame for every interactive experiment: the 3D canvas (orbit / pinch / tap objects),
 * a live read-out strip, and the controls underneath.
 */
export function LabShell({
  scene,
  controls,
  readout,
  hint = 'اسحب لتدوير المشهد · كبّر بالعجلة أو بإصبعين · اضغط على العناصر لمعرفة وظيفتها',
}: {
  scene: ReactNode;
  controls?: ReactNode;
  readout?: ReactNode;
  hint?: string;
}) {
  const [info, setInfo] = useState<InfoCard | null>(null);
  const [viewKey, setViewKey] = useState(0);
  const [max, setMax] = useState(false);

  useEffect(() => {
    if (!max) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMax(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [max]);

  useEffect(() => {
    if (max) setViewKey((k) => k + 1);
  }, [max]);

  return (
    <div className={`lab${max ? ' is-max' : ''}`}>
      <div className="lab-stage">
        <Canvas
          dpr={[1, 1.75]}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          camera={{ fov: 42, position: [0, 0, 12] }}
          onPointerMissed={() => setInfo(null)}
        >
          <LabContext.Provider value={{ setInfo, viewKey }}>
            <Lights />
            <Dust />
            {scene}
          </LabContext.Provider>
        </Canvas>
        <div className="lab-tools">
          <button type="button" className="icon-btn" onClick={() => setViewKey((k) => k + 1)} title="إعادة الزاوية">
            ⟲ <span>الزاوية</span>
          </button>
          <button type="button" className="icon-btn" onClick={() => setMax((m) => !m)} title={max ? 'تصغير' : 'ملء الشاشة'}>
            {max ? '✕ تصغير' : '⤢ تكبير'}
          </button>
        </div>
        {info ? (
          <div className="lab-info" role="status">
            <button type="button" className="lab-info-x" onClick={() => setInfo(null)} aria-label="إغلاق">
              ✕
            </button>
            <strong>
              <RichInline text={info.title} />
            </strong>
            <Rich text={info.body} />
          </div>
        ) : (
          <div className="lab-hint">{hint}</div>
        )}
      </div>
      {readout && <div className="lab-readout">{readout}</div>}
      {controls && <div className="lab-controls">{controls}</div>}
    </div>
  );
}
