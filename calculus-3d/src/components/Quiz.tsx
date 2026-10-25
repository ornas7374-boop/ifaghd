import { useState } from 'react';
import type { Quiz as QuizT } from '../content/types';
import { progress } from '../lib/progress';
import { Rich, RichInline } from './Tex';

export function Quiz({ quiz, lessonId }: { quiz: QuizT; lessonId: string }) {
  const [pick, setPick] = useState<number | null>(null);
  const right = pick === quiz.correct;
  return (
    <div className="quiz">
      <p className="quiz-q">
        <RichInline text={quiz.q} />
      </p>
      <div className="quiz-opts">
        {quiz.options.map((o, i) => {
          const state = pick === null ? '' : i === quiz.correct ? 'is-right' : i === pick ? 'is-wrong' : 'is-dim';
          return (
            <button
              key={i}
              type="button"
              className={`quiz-opt ${state}`}
              onClick={() => {
                setPick(i);
                if (i === quiz.correct) progress.setDone(lessonId, true);
              }}
              disabled={pick !== null && right}
            >
              <span className="quiz-letter">{'أبجد'[i]}</span>
              <RichInline text={o} />
            </button>
          );
        })}
      </div>
      {pick !== null && (
        <div className={`quiz-feedback ${right ? 'ok' : 'no'}`} role="status">
          <strong>{right ? 'إجابة صحيحة — أُضيف الدرس إلى الدروس المكتملة ✓' : 'ليست هذه. فكّر مرة أخرى ثم جرّب:'}</strong>
          {right && <Rich text={quiz.explain} />}
          {!right && (
            <button type="button" className="btn btn-ghost" onClick={() => setPick(null)}>
              حاول مرة أخرى
            </button>
          )}
        </div>
      )}
    </div>
  );
}
