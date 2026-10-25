import { useCallback, useEffect, useState } from 'react';

// Routes are plain hash tokens (#map, #practice, #<lesson-id>) so links survive sandboxed hosts
// that only forward simple anchors.
export type Route =
  | { view: 'intro' }
  | { view: 'map' }
  | { view: 'practice' }
  | { view: 'lesson'; id: string };

export function parseToken(token: string, lessonIds: Set<string>): Route {
  const t = token.replace(/^#/, '');
  if (t === 'map') return { view: 'map' };
  if (t === 'practice') return { view: 'practice' };
  if (lessonIds.has(t)) return { view: 'lesson', id: t };
  return { view: 'intro' };
}

export function routeToken(r: Route): string {
  if (r.view === 'lesson') return r.id;
  if (r.view === 'intro') return '';
  return r.view;
}

export function useRoute(lessonIds: Set<string>) {
  const read = () => {
    try {
      return parseToken(window.location.hash, lessonIds);
    } catch {
      return { view: 'intro' } as Route;
    }
  };
  const [route, setRoute] = useState<Route>(read);

  useEffect(() => {
    const onHash = () => setRoute(read());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const navigate = useCallback((r: Route) => {
    setRoute(r);
    const token = routeToken(r);
    try {
      if (token) window.location.hash = token;
      else history.replaceState(null, '', window.location.pathname + window.location.search);
    } catch {
      /* hash updates are a convenience only */
    }
  }, []);

  return [route, navigate] as const;
}
