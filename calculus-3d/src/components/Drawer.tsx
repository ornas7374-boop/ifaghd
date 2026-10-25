import { useState } from 'react';
import { LESSONS, SECTIONS } from '../content';
import { progress, useProgress } from '../lib/progress';

export function Drawer({
  open,
  onClose,
  current,
  onGo,
  onPractice,
}: {
  open: boolean;
  onClose: () => void;
  current?: string;
  onGo: (id: string) => void;
  onPractice: () => void;
}) {
  const { done } = useProgress();
  const [confirmReset, setConfirmReset] = useState(false);
  return (
    <>
      <div className={`drawer-bg ${open ? 'open' : ''}`} onClick={onClose} />
      <aside className={`drawer ${open ? 'open' : ''}`} aria-hidden={!open} aria-label="قائمة الدروس">
        <div className="drawer-head">
          <strong>كل الدروس</strong>
          <span className="drawer-count">
            {done.length} / {LESSONS.length} مكتمل
          </span>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="إغلاق القائمة">
            ✕
          </button>
        </div>
        <div className="drawer-bar">
          <span style={{ width: `${(done.length / LESSONS.length) * 100}%` }} />
        </div>
        <nav className="drawer-body">
          {SECTIONS.map((s) => (
            <div key={s.id} className="drawer-sec">
              <div className="drawer-sec-title" style={{ color: s.color }}>
                <span className="sec-num">{s.id}</span> {s.title}
              </div>
              <ul>
                {LESSONS.filter((l) => l.section === s.id).map((l) => {
                  const isDone = done.includes(l.id);
                  return (
                    <li key={l.id}>
                      <button
                        type="button"
                        className={`drawer-item ${current === l.id ? 'cur' : ''}`}
                        onClick={() => onGo(l.id)}
                        tabIndex={open ? 0 : -1}
                      >
                        <span className={`check ${isDone ? 'on' : ''}`} aria-label={isDone ? 'مكتمل' : 'غير مكتمل'}>
                          {isDone ? '✓' : ''}
                        </span>
                        <span>{l.title}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          <div className="drawer-sec">
            <button type="button" className="drawer-item practice" onClick={onPractice} tabIndex={open ? 0 : -1}>
              <span className="check">✎</span>
              <span>قاعة التدريب: 30 مسألة + 24 تمرين مراجعة</span>
            </button>
          </div>
          <div className="drawer-reset">
            {confirmReset ? (
              <>
                <span>مسح كل التقدم؟</span>
                <button
                  type="button"
                  className="btn btn-ghost danger"
                  onClick={() => {
                    progress.reset();
                    setConfirmReset(false);
                  }}
                >
                  نعم، امسح
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setConfirmReset(false)}>
                  إلغاء
                </button>
              </>
            ) : (
              <button type="button" className="btn btn-ghost" onClick={() => setConfirmReset(true)} tabIndex={open ? 0 : -1}>
                إعادة ضبط التقدم
              </button>
            )}
          </div>
        </nav>
      </aside>
    </>
  );
}
