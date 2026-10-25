import { useState } from 'react';
import { RichInline } from '../components/Tex';
import { LESSONS } from '../content';
import { REVIEW, TUTORIAL, type PracticeItem } from '../content/practice';

function Item({ it, showAll, onLesson }: { it: PracticeItem; showAll: boolean; onLesson: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const shown = open || showAll;
  const lesson = LESSONS.find((l) => l.id === it.lesson);
  return (
    <li className="p-item">
      <span className="p-n">{it.n}</span>
      <div className="p-body">
        <div className="p-q">
          <RichInline text={it.q} />
        </div>
        {shown ? (
          <div className="p-a">
            <RichInline text={it.a} />
            {it.note && (
              <p className="p-note">
                <RichInline text={it.note} />
              </p>
            )}
          </div>
        ) : null}
        <div className="p-actions">
          {!showAll && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen((v) => !v)}>
              {shown ? 'أخفِ الإجابة' : 'أظهر الإجابة'}
            </button>
          )}
          {lesson && (
            <button type="button" className="btn btn-link btn-sm" onClick={() => onLesson(lesson.id)}>
              راجع درس «{lesson.title}»
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

export function PracticeView({ onLesson }: { onLesson: (id: string) => void }) {
  const [tab, setTab] = useState<'tut' | 'rev'>('tut');
  const [all, setAll] = useState(false);
  const list = tab === 'tut' ? TUTORIAL : REVIEW;
  return (
    <div className="practice">
      <header className="practice-head">
        <h1>قاعة التدريب</h1>
        <p>حلّ المسألة على ورقة أولًا، ثم اكشف الإجابة. كل مسألة مرتبطة بالدرس الذي يشرحها.</p>
        <div className="seg" role="tablist">
          <button type="button" role="tab" aria-selected={tab === 'tut'} className={tab === 'tut' ? 'on' : ''} onClick={() => setTab('tut')}>
            جلسة حل المسائل (30)
          </button>
          <button type="button" role="tab" aria-selected={tab === 'rev'} className={tab === 'rev' ? 'on' : ''} onClick={() => setTab('rev')}>
            مراجعة الفصل الأول (24)
          </button>
        </div>
        <label className="toggle" htmlFor="show-all">
          <input id="show-all" type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} />
          <span className="toggle-track" aria-hidden="true" />
          <span>أظهر كل الإجابات</span>
        </label>
        {tab === 'tut' && (
          <p className="p-warning">
            <RichInline text="تنبيه دقة: إجابة المسألة 4 في مفتاح الملف مكتوبة $(1,6)$ والصحيح $[1,6)$ — التفسير داخل المسألة." />
          </p>
        )}
      </header>
      <ol className="p-list" key={tab}>
        {list.map((it) => (
          <Item key={it.n} it={it} showAll={all} onLesson={onLesson} />
        ))}
      </ol>
    </div>
  );
}
