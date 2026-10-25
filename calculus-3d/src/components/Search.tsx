import { useEffect, useMemo, useRef, useState } from 'react';
import { LESSONS, sectionOf } from '../content';
import { normalize } from '../lib/text';
import { RichInline } from './Tex';

interface Hit {
  id: string;
  title: string;
  section: string;
  snippet: string;
  score: number;
}

const INDEX = LESSONS.map((l) => ({
  l,
  title: normalize(l.title + ' ' + l.en),
  keys: normalize(l.keywords.join(' ')),
  formulas: normalize(l.formulas.map((f) => f.tex + ' ' + (f.caption ?? '')).join(' ')),
  body: normalize([l.idea, l.how, l.life, l.why].join(' ')),
}));

export function Search({ open, onClose, onGo }: { open: boolean; onClose: () => void; onGo: (id: string) => void }) {
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQ('');
      setSel(0);
      setTimeout(() => input.current?.focus(), 30);
    }
  }, [open]);

  const hits = useMemo<Hit[]>(() => {
    const nq = normalize(q);
    if (!nq) return LESSONS.map((l) => ({ id: l.id, title: l.title, section: l.section, snippet: l.en, score: 0 }));
    const terms = nq.split(' ').filter(Boolean);
    const out: Hit[] = [];
    for (const it of INDEX) {
      let score = 0;
      for (const t of terms) {
        if (it.title.includes(t)) score += 6;
        if (it.keys.includes(t)) score += 4;
        if (it.formulas.includes(t)) score += 3;
        if (it.body.includes(t)) score += 1;
      }
      if (score > 0) {
        const f = it.l.formulas.find((x) => normalize(x.tex + ' ' + (x.caption ?? '')).includes(terms[0]));
        out.push({ id: it.l.id, title: it.l.title, section: it.l.section, snippet: f ? `$${f.tex}$` : it.l.en, score });
      }
    }
    return out.sort((a, b) => b.score - a.score);
  }, [q]);

  if (!open) return null;
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="search" role="dialog" aria-label="البحث في الدروس" onClick={(e) => e.stopPropagation()}>
        <input
          ref={input}
          id="search-input"
          className="search-input"
          placeholder="ابحث عن مفهوم أو معادلة… مثل: مجال، لوغاريتم، sin، فترة"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setSel(0);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setSel((s) => Math.min(hits.length - 1, s + 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setSel((s) => Math.max(0, s - 1));
            } else if (e.key === 'Enter' && hits[sel]) {
              onGo(hits[sel].id);
            } else if (e.key === 'Escape') onClose();
          }}
        />
        <ul className="search-list">
          {hits.length === 0 && <li className="search-empty">لا توجد نتائج. جرّب كلمة أبسط أو مصطلحًا إنجليزيًا مثل domain أو log.</li>}
          {hits.map((h, i) => {
            const lesson = LESSONS.find((l) => l.id === h.id)!;
            return (
              <li key={h.id}>
                <button type="button" className={`search-hit ${i === sel ? 'on' : ''}`} onMouseEnter={() => setSel(i)} onClick={() => onGo(h.id)}>
                  <span className="dot" style={{ background: sectionOf(lesson).color }} />
                  <span className="search-sec">{h.section}</span>
                  <span className="search-title">{h.title}</span>
                  <span className="search-snip">
                    <RichInline text={h.snippet} />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <div className="search-foot">↑ ↓ للتنقل · Enter للفتح · Esc للإغلاق</div>
      </div>
    </div>
  );
}
