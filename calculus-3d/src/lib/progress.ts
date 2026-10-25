import { useSyncExternalStore } from 'react';

// Per-viewer progress kept in localStorage; every access is guarded because storage can be blocked.
const KEY = 'calc3d-progress-v1';

interface State {
  done: string[];
  last?: string;
}

let state: State = load();
const listeners = new Set<() => void>();

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as State;
      if (Array.isArray(parsed.done)) return parsed;
    }
  } catch {
    /* ignore */
  }
  return { done: [] };
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export const progress = {
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  get: () => state,
  setDone(id: string, value: boolean) {
    const has = state.done.includes(id);
    if (value === has) return;
    state = { ...state, done: value ? [...state.done, id] : state.done.filter((d) => d !== id) };
    save();
  },
  setLast(id: string) {
    if (state.last === id) return;
    state = { ...state, last: id };
    save();
  },
  reset() {
    state = { done: [] };
    save();
  },
};

export function useProgress() {
  return useSyncExternalStore(progress.subscribe, progress.get, progress.get);
}
