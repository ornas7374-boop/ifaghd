"use client";

import { Bell, Calendar, CheckCheck, ChevronDown, ChevronRight, Plus, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { MenuItem, Popover } from "@/components/ui/popover";
import { StatusDot } from "@/components/ui/status";
import { Tip } from "@/components/ui/tooltip";
import { RANGE_LABEL } from "@/lib/data/api";
import type { Range, StatusTone } from "@/lib/data/types";
import { cn, timeAgo } from "@/lib/format";
import { useUrlState } from "@/lib/hooks/use-url-state";
import { useNow } from "@/lib/hooks/use-now";
import { groupFor, pageFor } from "@/lib/nav";
import { useApp } from "./app-state";

export const RANGES: Range[] = ["24h", "7d", "30d", "90d"];

const INITIAL_NOTIFICATIONS: { id: string; title: string; body: string; minsAgo: number; tone: StatusTone; unread: boolean }[] = [
  { id: "1", title: "ZATCA e-invoice sync failed", body: "3 invoices waiting · 401 Unauthorized", minsAgo: 23, tone: "danger", unread: true },
  { id: "2", title: "New refund request", body: "“Beans arrived damaged” · awaiting approval", minsAgo: 64, tone: "warning", unread: true },
  { id: "3", title: "Cold Brew Kit is almost out", body: "4 units left · reorder suggested", minsAgo: 58, tone: "warning", unread: true },
  { id: "4", title: "Weekly report is ready", body: "Revenue up 12.4% week over week", minsAgo: 60 * 14, tone: "info", unread: false },
];

export function Topbar() {
  const pathname = usePathname();
  const page = pageFor(pathname);
  const group = groupFor(pathname);
  const { setCreateOpen, setPaletteOpen } = useApp();

  return (
    <header className="sticky top-0 z-30 flex h-12 shrink-0 items-center gap-2 border-b border-border bg-bg/85 px-3 backdrop-blur-md md:px-4">
      {/* Mobile: brand + search (sidebar is replaced by bottom nav) */}
      <span className="flex size-6 items-center justify-center rounded-[6px] bg-accent-solid text-[11px] font-bold text-white md:hidden">B</span>

      <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
        <ol className="flex items-center gap-1 text-[13px]">
          <li className="hidden text-muted sm:block">
            <Link href="/" className="rounded-[4px] px-1 hover:text-fg">
              Bayt Coffee
            </Link>
          </li>
          {group && (
            <>
              <ChevronRight className="hidden size-3.5 text-dim sm:block" strokeWidth={1.5} />
              <li className="hidden text-muted sm:block">{group.label}</li>
            </>
          )}
          <ChevronRight className="hidden size-3.5 text-dim sm:block" strokeWidth={1.5} />
          <li aria-current="page" className="truncate px-1 font-medium text-fg">
            {page.label}
          </li>
        </ol>
      </nav>

      <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setPaletteOpen(true)} aria-label="Search">
        <Search strokeWidth={1.5} />
      </Button>
      <DateRangePicker />
      <Notifications />
      <Button variant="primary" size="md" onClick={() => setCreateOpen(true)} className="group relative max-sm:w-8 max-sm:justify-center max-sm:px-0" aria-keyshortcuts="C">
        <Plus strokeWidth={2} />
        <span className="max-sm:sr-only">New</span>
        <Tip align="end">
          Create <Kbd keys={["C"]} />
        </Tip>
      </Button>
    </header>
  );
}

export function DateRangePicker() {
  const [range, setRange] = useUrlState<Range>("range", "30d", RANGES);
  return (
    <Popover
      label="Date range"
      className="w-56"
      trigger={({ toggle, open, ref, id }) => (
        <Button ref={ref} onClick={toggle} aria-expanded={open} aria-controls={id} aria-haspopup="menu" size="md" className="max-sm:w-8 max-sm:justify-center max-sm:px-0">
          <Calendar strokeWidth={1.5} className="text-muted" />
          <span className="tabular max-sm:sr-only">{RANGE_LABEL[range]}</span>
          <ChevronDown strokeWidth={1.5} className="!size-3.5 text-dim max-sm:hidden" />
        </Button>
      )}
    >
      {(close) => (
        <>
          {RANGES.map((r, i) => (
            <MenuItem
              key={r}
              checked={r === range}
              hint={<Kbd keys={[String(i + 1)]} />}
              onSelect={() => {
                setRange(r);
                close();
              }}
            >
              {RANGE_LABEL[r]}
            </MenuItem>
          ))}
          <p className="border-t border-border px-2 pb-1 pt-2 text-[11.5px] text-dim">Compared with the previous period of equal length.</p>
        </>
      )}
    </Popover>
  );
}

function Notifications() {
  const [items, setItems] = useState(INITIAL_NOTIFICATIONS);
  const now = useNow();
  const unread = items.filter((i) => i.unread).length;
  return (
    <Popover
      label="Notifications"
      role="dialog"
      className="w-[340px] max-w-[calc(100vw-1.5rem)] p-0"
      trigger={({ toggle, open, ref, id }) => (
        <Button
          ref={ref}
          variant="ghost"
          size="icon"
          onClick={toggle}
          aria-expanded={open}
          aria-controls={id}
          aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
          className="group relative"
        >
          <Bell strokeWidth={1.5} />
          {unread > 0 && <span className="absolute right-[7px] top-[7px] size-[7px] rounded-full bg-accent ring-2 ring-[var(--bg)]" />}
        </Button>
      )}
    >
      <div className="flex h-10 items-center justify-between border-b border-border px-3">
        <span className="text-[13px] font-medium">Notifications</span>
        <button
          type="button"
          disabled={!unread}
          onClick={() => setItems((xs) => xs.map((x) => ({ ...x, unread: false })))}
          className="flex items-center gap-1 rounded-[5px] px-1.5 py-0.5 text-[12px] text-muted hover:bg-hover hover:text-fg disabled:opacity-40"
        >
          <CheckCheck className="size-3.5" strokeWidth={1.5} /> Mark all read
        </button>
      </div>
      <ul className="max-h-[360px] overflow-y-auto p-1">
        {items.map((n) => (
          <li key={n.id}>
            <button
              type="button"
              role="menuitem"
              onClick={() => setItems((xs) => xs.map((x) => (x.id === n.id ? { ...x, unread: false } : x)))}
              className={cn("flex w-full items-start gap-2.5 rounded-[6px] px-2 py-2 text-left hover:bg-hover focus-visible:bg-hover focus-visible:outline-none", !n.unread && "opacity-60")}
            >
              <StatusDot tone={n.tone} className="mt-1.5" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium">{n.title}</span>
                <span className="block truncate text-[12px] text-muted">{n.body}</span>
              </span>
              <span className="tabular shrink-0 text-[11.5px] text-dim">{now ? timeAgo(now - n.minsAgo * 60_000, now) : ""}</span>
            </button>
          </li>
        ))}
      </ul>
    </Popover>
  );
}
