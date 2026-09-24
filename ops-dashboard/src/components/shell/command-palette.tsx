"use client";

import {
  ArrowRight,
  Clock,
  CornerDownLeft,
  Download,
  Keyboard,
  Moon,
  Package,
  PanelLeft,
  Plus,
  RotateCw,
  Search,
  Sun,
  User,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Kbd } from "@/components/ui/kbd";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { searchIndex } from "@/lib/data/api";
import { cn } from "@/lib/format";
import { ALL_PAGES } from "@/lib/nav";
import { useApp } from "./app-state";

interface Cmd {
  id: string;
  group: "Recent" | "Pages" | "Actions" | "Orders" | "Customers" | "Workflows";
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  keys?: string[];
  keywords?: string;
  run: () => void;
}

/**
 * Fuzzy match: every query char must appear in order. Score rewards
 * contiguous runs and word-start hits so "zat" ranks "ZATCA sync" first.
 */
function score(text: string, q: string) {
  if (!q) return 1;
  const t = text.toLowerCase();
  const direct = t.indexOf(q);
  if (direct !== -1) return 100 - direct + (direct === 0 || t[direct - 1] === " " ? 20 : 0);
  let ti = 0;
  let s = 0;
  let run = 0;
  for (const ch of q) {
    const found = t.indexOf(ch, ti);
    if (found === -1) return 0;
    run = found === ti ? run + 1 : 0;
    s += 1 + run * 2 + (found === 0 || t[found - 1] === " " ? 3 : 0);
    ti = found + 1;
  }
  return s;
}

const RECENT_KEY = "relay-recent-commands";
function readRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function CommandPalette() {
  const { paletteOpen, setPaletteOpen, setCreateOpen, setTheme, theme, collapsed, setCollapsed, setShortcutsOpen } = useApp();
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [recent, setRecent] = useState<string[]>([]);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (paletteOpen) {
      /* eslint-disable react-hooks/set-state-in-effect -- reset palette on open */
      setQ("");
      setActive(0);
      setRecent(readRecent());
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [paletteOpen]);

  const openRecord = (param: string, id: string) => {
    const sp = new URLSearchParams(window.location.search);
    sp.delete("order");
    sp.delete("workflow");
    sp.set(param, id);
    router.push(`${pathname}?${sp.toString()}`, { scroll: false });
  };

  const commands = useMemo<Cmd[]>(() => {
    if (!paletteOpen) return [];
    const idx = searchIndex();
    const pages: Cmd[] = ALL_PAGES.map((p) => ({
      id: `page:${p.href}`,
      group: "Pages",
      title: p.label,
      subtitle: p.href === "/" ? "Home" : p.href,
      icon: p.icon,
      keys: p.go ? ["G", p.go.toUpperCase()] : undefined,
      run: () => router.push(p.href),
    }));
    const actions: Cmd[] = [
      { id: "act:new", group: "Actions", title: "Create order", icon: Plus, keys: ["C"], keywords: "new add", run: () => setCreateOpen(true) },
      {
        id: "act:retry",
        group: "Actions",
        title: "Retry failed workflow runs",
        subtitle: "ZATCA e-invoice sync · 3 runs",
        icon: RotateCw,
        keywords: "rerun automation",
        run: () => toast({ tone: "success", title: "Retrying 3 failed runs", description: "ZATCA e-invoice sync · you'll be notified on completion" }),
      },
      {
        id: "act:export",
        group: "Actions",
        title: "Export overview report",
        subtitle: "CSV · current date range",
        icon: Download,
        keywords: "download csv",
        run: () => toast({ tone: "info", title: "Export started", description: "We'll email the CSV to rayan@baytcoffee.sa" }),
      },
      {
        id: "act:theme",
        group: "Actions",
        title: theme === "dark" ? "Switch to light theme" : "Switch to dark theme",
        icon: theme === "dark" ? Sun : Moon,
        keywords: "appearance mode dark light",
        run: () => setTheme(theme === "dark" ? "light" : "dark"),
      },
      { id: "act:sidebar", group: "Actions", title: collapsed ? "Expand sidebar" : "Collapse sidebar", icon: PanelLeft, keys: ["["], run: () => setCollapsed(!collapsed) },
      { id: "act:keys", group: "Actions", title: "Keyboard shortcuts", icon: Keyboard, keys: ["?"], run: () => setShortcutsOpen(true) },
    ];
    const orders: Cmd[] = idx.orders.map((o) => ({ id: `order:${o.id}`, group: "Orders", title: o.title, subtitle: o.subtitle, icon: Package, run: () => openRecord("order", o.id) }));
    const customers: Cmd[] = idx.customers.map((c) => ({
      id: `customer:${c.id}`,
      group: "Customers",
      title: c.title,
      subtitle: c.subtitle,
      icon: User,
      run: () => toast({ tone: "info", title: `${c.title}`, description: "Customer profiles ship with the Customers page." }),
    }));
    const workflows: Cmd[] = idx.workflows.map((w) => ({ id: `wf:${w.id}`, group: "Workflows", title: w.title, subtitle: w.subtitle, icon: Workflow, run: () => openRecord("workflow", w.id) }));
    return [...pages, ...actions, ...workflows, ...orders, ...customers];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paletteOpen, theme, collapsed, pathname]);

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) {
      const byId = new Map(commands.map((c) => [c.id, c]));
      const rec = recent.map((id) => byId.get(id)).filter(Boolean).slice(0, 4).map((c) => ({ ...c!, group: "Recent" as const }));
      return [...rec, ...commands.filter((c) => c.group === "Pages" || c.group === "Actions")];
    }
    const PER_GROUP = { Recent: 0, Pages: 6, Actions: 6, Workflows: 5, Orders: 6, Customers: 5 };
    const scored = commands
      .map((c) => {
        // Records (thousands of rows) need a real substring hit; fuzzy is for pages/actions/workflows.
        const hay = `${c.title} ${c.subtitle ?? ""}`.toLowerCase();
        if ((c.group === "Orders" || c.group === "Customers") && !hay.includes(query)) return { c, s: 0 };
        return { c, s: Math.max(score(c.title, query) * 1.2, score(`${c.subtitle ?? ""} ${c.keywords ?? ""}`, query)) };
      })
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s);
    const counts: Record<string, number> = {};
    const out: Cmd[] = [];
    for (const { c } of scored) {
      counts[c.group] = (counts[c.group] ?? 0) + 1;
      if (counts[c.group] <= PER_GROUP[c.group]) out.push(c);
    }
    // Groups appear in order of their best hit, so "zat" leads with the ZATCA workflow.
    const order = [...new Set(scored.map((x) => x.c.group))];
    return out.sort((a, b) => order.indexOf(a.group) - order.indexOf(b.group));
  }, [q, commands, recent]);

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const execute = (c: Cmd) => {
    const baseId = c.id;
    try {
      const next = [baseId, ...readRecent().filter((x) => x !== baseId)].slice(0, 6);
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    setPaletteOpen(false);
    // Let the modal unmount (and restore focus) before running the command.
    requestAnimationFrame(() => c.run());
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || (e.ctrlKey && e.key === "n")) {
      e.preventDefault();
      setActive((a) => Math.min(results.length - 1, a + 1));
    } else if (e.key === "ArrowUp" || (e.ctrlKey && e.key === "p")) {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const c = results[active];
      if (c) execute(c);
    }
  };

  return (
    <Modal open={paletteOpen} onClose={() => setPaletteOpen(false)} label="Command palette" position="top" className="max-w-[620px]">
      <div className="flex h-12 items-center gap-2.5 border-b border-border px-4">
        <Search className="size-4 shrink-0 text-muted" strokeWidth={1.5} />
        <input
          autoFocus
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          placeholder="Search orders, customers, workflows, or run a command…"
          className="h-full flex-1 bg-transparent text-[14px] text-fg outline-none placeholder:text-dim focus-visible:outline-none"
          role="combobox"
          aria-expanded="true"
          aria-controls="cmdk-list"
          aria-activedescendant={results[active] ? `cmdk-${active}` : undefined}
          aria-autocomplete="list"
        />
        <Kbd keys={["Esc"]} />
      </div>
      <div ref={listRef} id="cmdk-list" role="listbox" aria-label="Results" className="max-h-[min(420px,60vh)] overflow-y-auto p-1.5">
        {results.length === 0 && (
          <div className="px-3 py-10 text-center">
            <p className="text-[13px] text-fg">No results for “{q}”</p>
            <p className="mt-1 text-[12px] text-muted">Try an order ID like BC-10480, a customer name, or “retry”.</p>
          </div>
        )}
        {results.map((c, i) => {
          const header = i === 0 || results[i - 1].group !== c.group ? c.group : null;
          const Icon = c.group === "Recent" ? Clock : c.icon;
          return (
            <div key={`${c.group}-${c.id}`}>
              {header && <div className="px-2.5 pb-1 pt-2.5 text-[11px] font-medium text-dim">{header}</div>}
              <div
                id={`cmdk-${i}`}
                data-index={i}
                role="option"
                aria-selected={i === active}
                onMouseMove={() => i !== active && setActive(i)}
                onClick={() => execute(c)}
                className={cn("flex h-10 cursor-pointer items-center gap-3 rounded-[7px] px-2.5", i === active ? "bg-hover" : "")}
              >
                <Icon className={cn("size-4 shrink-0", i === active ? "text-fg" : "text-muted")} strokeWidth={1.5} />
                <span className="min-w-0 flex-1 truncate text-[13px]">
                  <span className="text-fg">{c.title}</span>
                  {c.subtitle && <span className="ml-2 text-muted">{c.subtitle}</span>}
                </span>
                {c.keys && <Kbd keys={c.keys} />}
                {i === active && !c.keys && <ArrowRight className="size-3.5 text-dim" strokeWidth={1.5} />}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex h-9 items-center gap-4 border-t border-border px-4 text-[11.5px] text-dim">
        <span className="flex items-center gap-1.5">
          <Kbd keys={["↑", "↓"]} /> Navigate
        </span>
        <span className="flex items-center gap-1.5">
          <kbd className="inline-flex h-[18px] items-center rounded-[4px] border border-border-strong bg-surface-2 px-1">
            <CornerDownLeft className="size-3" strokeWidth={1.5} />
          </kbd>
          Open
        </span>
        <span className="ml-auto hidden items-center gap-1.5 sm:flex">
          Tip: type <span className="font-mono text-muted">BC-</span> to jump to an order
        </span>
      </div>
    </Modal>
  );
}
