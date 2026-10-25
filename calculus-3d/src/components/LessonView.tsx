import { useEffect, useRef, useState, type ReactNode } from 'react';
import { LESSONS, lessonIndex, sectionOf } from '../content';
import type { Lesson } from '../content/types';
import { progress, useProgress } from '../lib/progress';
import { Quiz } from './Quiz';
import { Rich, RichInline, Tex } from './Tex';

const PARTS = [
  { id: 'idea', n: 1, label: 'الفكرة' },
  { id: 'formula', n: 2, label: 'المعادلة' },
  { id: 'symbols', n: 3, label: 'الرموز' },
  { id: 'how', n: 4, label: 'كيف تعمل' },
  { id: 'life', n: 5, label: 'من الحياة' },
  { id: 'why', n: 6, label: 'الفائدة' },
  { id: 'example', n: 7, label: 'مثال محلول' },
  { id: 'lab', n: 8, label: 'التجربة' },
  { id: 'quiz', n: 9, label: 'اختبر فهمك' },
];

function Card({ id, n, title, children, accent }: { id: string; n?: number; title: string; children: ReactNode; accent?: string }) {
  return (
    <section className="card" id={`part-${id}`} style={accent ? ({ '--sec': accent } as React.CSSProperties) : undefined}>
      <h2 className="card-title">
        {n !== undefined && <span className="card-n">{n}</span>}
        {title}
      </h2>
      <div className="card-body">{children}</div>
    </section>
  );
}

function Steps({ steps }: { steps: string[] }) {
  const [shown, setShown] = useState(1);
  return (
    <>
      <ol className="steps">
        {steps.slice(0, shown).map((s, i) => (
          <li key={i} className="step">
            <RichInline text={s} />
          </li>
        ))}
      </ol>
      {shown < steps.length && (
        <div className="ctl-row">
          <button type="button" className="btn btn-primary" onClick={() => setShown((v) => v + 1)}>
            الخطوة التالية ({shown}/{steps.length})
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => setShown(steps.length)}>
            أظهر كل الخطوات
          </button>
        </div>
      )}
    </>
  );
}

function Reveal({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="drill">
      <div className="drill-q">
        <RichInline text={q} />
      </div>
      {open ? (
        <div className="drill-a">
          <RichInline text={a} />
        </div>
      ) : (
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(true)}>
          أظهر الحل
        </button>
      )}
    </li>
  );
}

export function LessonView({ lesson, onGo, onMap }: { lesson: Lesson; onGo: (id: string) => void; onMap: () => void }) {
  const idx = lessonIndex(lesson.id);
  const prev = LESSONS[idx - 1];
  const next = LESSONS[idx + 1];
  const sec = sectionOf(lesson);
  const { done } = useProgress();
  const isDone = done.includes(lesson.id);
  const labRef = useRef<HTMLDivElement>(null);
  const Lab = lesson.lab;

  useEffect(() => {
    progress.setLast(lesson.id);
    window.scrollTo({ top: 0 });
  }, [lesson.id]);

  const jump = (id: string) => {
    if (id === 'lab' && labRef.current && window.matchMedia('(max-width: 1023px)').matches) {
      labRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    document.getElementById(`part-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="lesson" style={{ '--sec': sec.color } as React.CSSProperties} key={lesson.id}>
      <div className="lesson-head">
        <div className="crumbs">
          <button type="button" className="crumb" onClick={onMap}>
            الخريطة
          </button>
          <span aria-hidden="true">‹</span>
          <span className="crumb-sec" style={{ color: sec.color }}>
            القسم {sec.id} · {sec.title}
          </span>
        </div>
        <h1 className="lesson-title">{lesson.title}</h1>
        <p className="lesson-en" dir="ltr">
          {lesson.en}
        </p>
        <div className="lesson-actions">
          <button type="button" className={`btn ${isDone ? 'btn-done' : 'btn-ghost'}`} onClick={() => progress.setDone(lesson.id, !isDone)}>
            {isDone ? '✓ مكتمل' : 'علّمه كمكتمل'}
          </button>
          <span className="lesson-pos">
            الدرس {idx + 1} من {LESSONS.length}
          </span>
        </div>
        <nav className="parts" aria-label="أجزاء الدرس">
          {PARTS.map((p) => (
            <button key={p.id} type="button" className="part-chip" onClick={() => jump(p.id)}>
              <span>{p.n}</span> {p.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="lesson-grid">
        <div className="lesson-lab" ref={labRef} id="part-lab-stage">
          <Lab />
        </div>

        <div className="lesson-text">
          <Card id="idea" n={1} title="ما الفكرة؟">
            <Rich text={lesson.idea} />
          </Card>

          <Card id="formula" n={2} title="المعادلة">
            <div className="formulas">
              {lesson.formulas.map((f, i) => (
                <figure key={i} className="formula">
                  <Tex tex={f.tex} block />
                  {f.caption && (
                    <figcaption>
                      <RichInline text={f.caption} />
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
            {lesson.table && (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      {lesson.table.head.map((h, i) => (
                        <th key={i}>
                          <RichInline text={h} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {lesson.table.rows.map((row, i) => (
                      <tr key={i}>
                        {row.map((c, j) => (
                          <td key={j}>
                            <RichInline text={c} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card id="symbols" n={3} title="معنى الرموز">
            <div className="table-wrap">
              <table className="sym-table">
                <thead>
                  <tr>
                    <th>الرمز</th>
                    <th>معناه</th>
                    <th>نوعه / وحدته</th>
                  </tr>
                </thead>
                <tbody>
                  {lesson.symbols.map((s, i) => (
                    <tr key={i}>
                      <td className="sym">
                        <Tex tex={s.tex} />
                      </td>
                      <td>
                        <RichInline text={s.meaning} />
                      </td>
                      <td className="muted">
                        <RichInline text={s.kind} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card id="how" n={4} title="كيف تعمل؟">
            <Rich text={lesson.how} />
          </Card>

          <Card id="life" n={5} title="مثال من الحياة الواقعية">
            <Rich text={lesson.life} />
          </Card>

          <Card id="why" n={6} title="ما فائدتها؟">
            <Rich text={lesson.why} />
          </Card>

          <Card id="example" n={7} title="مثال محلول خطوة بخطوة">
            <p className="source">{lesson.example.source}</p>
            <div className="problem">
              <RichInline text={lesson.example.problem} />
            </div>
            <Steps key={lesson.id} steps={lesson.example.steps} />
            <div className="answer">
              <span>الإجابة:</span> <RichInline text={lesson.example.answer} />
            </div>
          </Card>

          {lesson.drills && (
            <Card id="drills" title="تدرّب أكثر (من تمارين الملف)">
              <ul className="drills">
                {lesson.drills.map((d, i) => (
                  <Reveal key={lesson.id + i} q={d.q} a={d.a} />
                ))}
              </ul>
            </Card>
          )}

          {lesson.mistakes && (
            <Card id="mistakes" title="أخطاء شائعة تجنّبها">
              <ul className="mistakes">
                {lesson.mistakes.map((m, i) => (
                  <li key={i}>
                    <RichInline text={m} />
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card id="lab" n={8} title="تفاعل بصري">
            <p>
              <RichInline text={lesson.labHint} />
            </p>
            <button type="button" className="btn btn-ghost only-mobile" onClick={() => labRef.current?.scrollIntoView({ behavior: 'smooth' })}>
              ↑ اذهب إلى المختبر ثلاثي الأبعاد
            </button>
          </Card>

          <Card id="quiz" n={9} title="اختبار فهم سريع">
            <Quiz key={lesson.id} quiz={lesson.quiz} lessonId={lesson.id} />
          </Card>

          <nav className="pager" aria-label="التنقل بين الدروس">
            {prev ? (
              <button type="button" className="pager-btn" onClick={() => onGo(prev.id)}>
                <small>→ السابق</small>
                {prev.title}
              </button>
            ) : (
              <span />
            )}
            <button type="button" className="pager-btn center" onClick={onMap}>
              <small>◎</small>
              الخريطة
            </button>
            {next ? (
              <button type="button" className="pager-btn end" onClick={() => onGo(next.id)}>
                <small>التالي ←</small>
                {next.title}
              </button>
            ) : (
              <span />
            )}
          </nav>
        </div>
      </div>
    </div>
  );
}
