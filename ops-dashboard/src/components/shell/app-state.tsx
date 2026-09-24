"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type Theme = "dark" | "light";

interface AppState {
  theme: Theme;
  setTheme: (t: Theme) => void;
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  paletteOpen: boolean;
  setPaletteOpen: (v: boolean) => void;
  createOpen: boolean;
  setCreateOpen: (v: boolean) => void;
  shortcutsOpen: boolean;
  setShortcutsOpen: (v: boolean) => void;
}

const Ctx = createContext<AppState | null>(null);

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be used inside <AppStateProvider>");
  return v;
}

function read(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode — preference just won't persist */
  }
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [collapsed, setCollapsedState] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  // Hydrate persisted preferences after mount (server always renders defaults).
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- one-time sync from localStorage */
    if (read("relay-theme") === "light") setThemeState("light");
    if (read("relay-sidebar") === "collapsed") setCollapsedState(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    write("relay-theme", t);
    if (t === "light") document.documentElement.dataset.theme = "light";
    else delete document.documentElement.dataset.theme;
  }, []);

  const setCollapsed = useCallback((v: boolean) => {
    setCollapsedState(v);
    write("relay-sidebar", v ? "collapsed" : "expanded");
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, collapsed, setCollapsed, paletteOpen, setPaletteOpen, createOpen, setCreateOpen, shortcutsOpen, setShortcutsOpen }),
    [theme, setTheme, collapsed, setCollapsed, paletteOpen, createOpen, shortcutsOpen],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
