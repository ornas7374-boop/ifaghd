import { useCallback, useEffect, useState } from 'react';
import { Drawer } from './components/Drawer';
import { LessonView } from './components/LessonView';
import { Search } from './components/Search';
import { TopBar } from './components/TopBar';
import { LESSON_IDS, LESSONS } from './content';
import { useRoute, type Route } from './lib/router';
import { IntroView } from './views/IntroView';
import { MapView } from './views/MapView';
import { PracticeView } from './views/PracticeView';

export default function App() {
  const [route, navigate] = useRoute(LESSON_IDS);
  const [drawer, setDrawer] = useState(false);
  const [search, setSearch] = useState(false);
  const [entering, setEntering] = useState(false);

  const go = useCallback(
    (r: Route) => {
      setDrawer(false);
      setSearch(false);
      navigate(r);
      window.scrollTo({ top: 0 });
    },
    [navigate],
  );
  const toLesson = useCallback((id: string) => go({ view: 'lesson', id }), [go]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA';
      if ((e.key === '/' && !typing) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        setSearch(true);
      } else if (e.key === 'Escape') {
        setSearch(false);
        setDrawer(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (route.view !== 'intro') setEntering(false);
  }, [route.view]);

  const lesson = route.view === 'lesson' ? LESSONS.find((l) => l.id === route.id) : undefined;

  if (route.view === 'intro') {
    return (
      <IntroView
        entering={entering}
        onEnter={() => {
          const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
          if (reduce) return go({ view: 'map' });
          setEntering(true);
          window.setTimeout(() => go({ view: 'map' }), 900);
        }}
        onLesson={toLesson}
      />
    );
  }

  return (
    <div className={`app view-${route.view}`}>
      <TopBar
        route={route}
        onMap={() => go({ view: 'map' })}
        onIntro={() => go({ view: 'intro' })}
        onMenu={() => setDrawer(true)}
        onSearch={() => setSearch(true)}
        onPractice={() => go({ view: 'practice' })}
      />
      <main className="main">
        {route.view === 'map' && <MapView onLesson={toLesson} onPractice={() => go({ view: 'practice' })} />}
        {route.view === 'practice' && <PracticeView onLesson={toLesson} />}
        {lesson && <LessonView lesson={lesson} onGo={toLesson} onMap={() => go({ view: 'map' })} />}
      </main>
      <Drawer
        open={drawer}
        onClose={() => setDrawer(false)}
        current={lesson?.id}
        onGo={toLesson}
        onPractice={() => go({ view: 'practice' })}
      />
      <Search open={search} onClose={() => setSearch(false)} onGo={toLesson} />
    </div>
  );
}
