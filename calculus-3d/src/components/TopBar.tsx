import { LESSONS } from '../content';
import { useProgress } from '../lib/progress';
import type { Route } from '../lib/router';

export function TopBar({
  route,
  onMap,
  onIntro,
  onMenu,
  onSearch,
  onPractice,
}: {
  route: Route;
  onMap: () => void;
  onIntro: () => void;
  onMenu: () => void;
  onSearch: () => void;
  onPractice: () => void;
}) {
  const { done } = useProgress();
  const pct = done.length / LESSONS.length;
  const C = 2 * Math.PI * 14;
  return (
    <header className="topbar">
      <button type="button" className="brand" onClick={onIntro} title="العودة إلى البوابة (نقطة البداية)">
        <span className="brand-mark" aria-hidden="true">
          ƒ
        </span>
        <span className="brand-text">
          عالم الدوال الحقيقية
          <small>MATH 1050 · الفصل الأول</small>
        </span>
      </button>
      <nav className="topnav">
        <button type="button" className={`nav-btn ${route.view === 'map' ? 'on' : ''}`} onClick={onMap}>
          <span aria-hidden="true">◎</span> <span className="nav-label">الخريطة</span>
        </button>
        <button type="button" className="nav-btn" onClick={onMenu}>
          <span aria-hidden="true">☰</span> <span className="nav-label">الدروس</span>
        </button>
        <button type="button" className={`nav-btn ${route.view === 'practice' ? 'on' : ''}`} onClick={onPractice}>
          <span aria-hidden="true">✎</span> <span className="nav-label">التدريب</span>
        </button>
        <button type="button" className="nav-btn search-btn" onClick={onSearch}>
          <span aria-hidden="true">⌕</span> <span className="nav-label">بحث</span> <kbd>/</kbd>
        </button>
        <button type="button" className="ring" onClick={onMenu} title={`${done.length} من ${LESSONS.length} دروس مكتملة`}>
          <svg viewBox="0 0 36 36" width="36" height="36" aria-hidden="true">
            <circle cx="18" cy="18" r="14" className="ring-bg" />
            <circle cx="18" cy="18" r="14" className="ring-fg" strokeDasharray={`${C * pct} ${C}`} transform="rotate(-90 18 18)" />
          </svg>
          <span className="ring-num">
            {done.length}/{LESSONS.length}
          </span>
        </button>
      </nav>
    </header>
  );
}
