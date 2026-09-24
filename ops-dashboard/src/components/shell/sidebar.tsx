"use client";

import {
  Check,
  ChevronDown,
  ChevronsUpDown,
  CircleHelp,
  Keyboard,
  LogOut,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Sun,
  User,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Kbd } from "@/components/ui/kbd";
import { MenuItem, MenuLabel, MenuSeparator, Popover } from "@/components/ui/popover";
import { Tip } from "@/components/ui/tooltip";
import { cn } from "@/lib/format";
import { GROUPS, PRIMARY, SETTINGS, type NavItem } from "@/lib/nav";
import { useApp } from "./app-state";

const WORKSPACES = [
  { id: "bayt", name: "Bayt Coffee", plan: "Growth", color: "#5e5ce6" },
  { id: "noor", name: "Noor Fragrances", plan: "Starter", color: "#3d7a5c" },
];

export const USER = { name: "Rayan Al-Otaibi", email: "rayan@baytcoffee.sa", role: "Owner" };

// Live counts shown on nav items. In production these come from a lightweight /api/counts poll.
const BADGES = { pendingOrders: 12, failingWorkflows: 1 };

export function Sidebar() {
  const { collapsed, setCollapsed, setPaletteOpen, theme, setTheme, setShortcutsOpen } = useApp();
  const pathname = usePathname();
  const [closedGroups, setClosedGroups] = useState<Record<string, boolean>>({});
  // `rail` = icons only. Forced on tablet (md–lg) via CSS, user-toggled on desktop.
  const label = collapsed ? "sr-only" : "max-lg:sr-only";

  return (
    <aside
      aria-label="Primary"
      className={cn(
        "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-border bg-sidebar transition-[width] duration-200 ease-out-expo md:flex",
        collapsed ? "w-14" : "w-14 lg:w-60",
      )}
    >
      {/* Workspace switcher */}
      <div className={cn("flex h-12 items-center gap-1 px-2", !collapsed && "lg:px-3")}>
        <Popover
          align="start"
          label="Switch workspace"
          className="w-64"
          trigger={({ toggle, open, ref, id }) => (
            <button
              ref={ref}
              type="button"
              onClick={toggle}
              aria-expanded={open}
              aria-controls={id}
              aria-haspopup="menu"
              className={cn("group flex h-8 min-w-0 items-center gap-2 rounded-[6px] px-1.5 hover:bg-hover", !collapsed && "lg:flex-1")}
            >
              <span className="flex size-5 shrink-0 items-center justify-center rounded-[5px] bg-accent-solid text-[10px] font-bold text-white">B</span>
              <span className={cn("min-w-0 flex-1 truncate text-left text-[13px] font-semibold", label)}>Bayt Coffee</span>
              <ChevronDown className={cn("size-3.5 shrink-0 text-dim", label)} strokeWidth={1.5} />
            </button>
          )}
        >
          {(close) => (
            <>
              <MenuLabel>{USER.email}</MenuLabel>
              {WORKSPACES.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  role="menuitem"
                  onClick={close}
                  className="flex h-9 w-full items-center gap-2.5 rounded-[6px] px-2 text-left hover:bg-hover focus-visible:bg-hover focus-visible:outline-none"
                >
                  <span className="flex size-5 items-center justify-center rounded-[5px] text-[10px] font-bold text-white" style={{ background: w.color }}>
                    {w.name[0]}
                  </span>
                  <span className="flex-1 text-[13px]">{w.name}</span>
                  <span className="text-[11px] text-dim">{w.plan}</span>
                  {w.id === "bayt" && <Check className="size-3.5 text-accent" strokeWidth={2} />}
                </button>
              ))}
              <MenuSeparator />
              <MenuItem icon={Plus}>Create workspace</MenuItem>
            </>
          )}
        </Popover>
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn("group relative hidden size-7 shrink-0 items-center justify-center rounded-[6px] text-dim hover:bg-hover hover:text-fg", !collapsed && "lg:flex")}
        >
          <PanelLeftClose className="size-4" strokeWidth={1.5} />
          <Tip>
            Collapse <Kbd keys={["["]} />
          </Tip>
        </button>
      </div>

      {/* Search */}
      <div className="px-2">
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          className="group relative flex h-8 w-full items-center gap-2 rounded-[6px] border border-border bg-surface px-2 text-muted transition-colors hover:border-border-strong hover:text-fg max-lg:justify-center"
          aria-label="Search or run a command"
          aria-keyshortcuts="Meta+K Control+K"
        >
          <Search className="size-4 shrink-0" strokeWidth={1.5} />
          <span className={cn("flex-1 text-left text-[12.5px]", label)}>Search…</span>
          <Kbd keys={["⌘", "K"]} className={label} />
          <Tip side="right" className={collapsed ? "" : "lg:hidden"}>
            Search <Kbd keys={["⌘", "K"]} />
          </Tip>
        </button>
      </div>

      <nav className={cn("mt-3 flex min-h-0 flex-1 flex-col gap-4 px-2 pb-2", collapsed ? "overflow-visible" : "max-lg:overflow-visible lg:overflow-y-auto")}>
        <ul className="flex flex-col gap-px">
          {PRIMARY.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} collapsed={collapsed} />
          ))}
        </ul>

        {GROUPS.map((g) => {
          const closed = closedGroups[g.id];
          return (
            <div key={g.id}>
              <button
                type="button"
                onClick={() => setClosedGroups((s) => ({ ...s, [g.id]: !closed }))}
                aria-expanded={!closed}
                className={cn("group mb-0.5 flex h-6 w-full items-center gap-1 rounded-[5px] px-2 text-[11.5px] font-medium text-dim hover:text-muted", collapsed ? "hidden" : "max-lg:hidden")}
              >
                {g.label}
                <ChevronDown className={cn("size-3 transition-transform duration-150", closed && "-rotate-90")} strokeWidth={2} />
              </button>
              {(collapsed ? true : !closed) && (
                <ul className={cn("flex flex-col gap-px", collapsed ? "border-t border-border pt-3" : "max-lg:border-t max-lg:border-border max-lg:pt-3")}>
                  {g.items.map((item) => (
                    <NavLink key={item.href} item={item} pathname={pathname} collapsed={collapsed} />
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="flex flex-col gap-px border-t border-border p-2">
        <SideButton icon={CircleHelp} label="Help & shortcuts" collapsed={collapsed} onClick={() => setShortcutsOpen(true)} hint={<Kbd keys={["?"]} />} />
        <NavLink item={SETTINGS} pathname={pathname} collapsed={collapsed} />
        {collapsed && <SideButton icon={PanelLeftOpen} label="Expand sidebar" collapsed onClick={() => setCollapsed(false)} className="max-lg:hidden" />}
        <Popover
          side="top"
          align="start"
          label="Account"
          className="w-60"
          trigger={({ toggle, open, ref, id }) => (
            <button
              ref={ref}
              type="button"
              onClick={toggle}
              aria-expanded={open}
              aria-controls={id}
              aria-haspopup="menu"
              aria-label="Account menu"
              className="mt-1 flex h-9 w-full items-center gap-2 rounded-[6px] px-1.5 hover:bg-hover"
            >
              <Avatar name={USER.name} size={22} />
              <span className={cn("min-w-0 flex-1 text-left", label)}>
                <span className="block truncate text-[12.5px] font-medium leading-tight">{USER.name}</span>
                <span className="block truncate text-[11px] leading-tight text-dim">{USER.role}</span>
              </span>
              <ChevronsUpDown className={cn("size-3.5 text-dim", label)} strokeWidth={1.5} />
            </button>
          )}
        >
          {(close) => (
            <>
              <MenuLabel>{USER.email}</MenuLabel>
              <MenuItem icon={User} onSelect={close}>
                Profile
              </MenuItem>
              <MenuItem
                icon={theme === "dark" ? Sun : Moon}
                onSelect={() => {
                  setTheme(theme === "dark" ? "light" : "dark");
                  close();
                }}
              >
                {theme === "dark" ? "Light theme" : "Dark theme"}
              </MenuItem>
              <MenuItem
                icon={Keyboard}
                hint={<Kbd keys={["?"]} />}
                onSelect={() => {
                  close();
                  setShortcutsOpen(true);
                }}
              >
                Keyboard shortcuts
              </MenuItem>
              <MenuSeparator />
              <MenuItem icon={LogOut} onSelect={close}>
                Log out
              </MenuItem>
            </>
          )}
        </Popover>
      </div>
    </aside>
  );
}

function NavLink({ item, pathname, collapsed }: { item: NavItem; pathname: string; collapsed: boolean }) {
  const active = item.href === "/" ? pathname === "/" : pathname === item.href || (pathname.startsWith(item.href + "/") && item.href !== "/automations");
  const Icon = item.icon;
  const count = item.badge ? BADGES[item.badge] : 0;
  const danger = item.badge === "failingWorkflows";
  return (
    <li>
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "group relative flex h-8 items-center gap-2.5 rounded-[6px] px-2 text-[13px] font-medium transition-colors duration-100 max-lg:justify-center",
          collapsed && "justify-center",
          active ? "bg-hover text-fg" : "text-muted hover:bg-hover/60 hover:text-fg",
        )}
      >
        <Icon className={cn("size-4 shrink-0", active ? "text-accent" : "")} strokeWidth={1.5} />
        <span className={cn("flex-1 truncate", collapsed ? "sr-only" : "max-lg:sr-only")}>{item.label}</span>
        {count > 0 && (
          <span
            className={cn(
              "tabular rounded-[4px] px-1 text-[11px] font-medium",
              danger ? "bg-danger/12 text-danger" : "text-dim",
              collapsed ? "absolute right-1 top-1 size-1.5 rounded-full bg-accent p-0 text-[0px]" : "max-lg:absolute max-lg:right-1 max-lg:top-1 max-lg:size-1.5 max-lg:rounded-full max-lg:bg-accent max-lg:p-0 max-lg:text-[0px]",
              danger && (collapsed ? "!bg-danger" : "max-lg:!bg-danger"),
            )}
          >
            {count}
          </span>
        )}
        <Tip side="right" className={collapsed ? "" : "lg:hidden"}>
          {item.label}
          {item.go && <Kbd keys={["G", item.go.toUpperCase()]} />}
        </Tip>
      </Link>
    </li>
  );
}

function SideButton({
  icon: Icon,
  label: text,
  collapsed,
  onClick,
  hint,
  className,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  collapsed: boolean;
  onClick: () => void;
  hint?: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("group relative flex h-8 w-full items-center gap-2.5 rounded-[6px] px-2 text-[13px] font-medium text-muted hover:bg-hover/60 hover:text-fg max-lg:justify-center", collapsed && "justify-center", className)}
    >
      <Icon className="size-4 shrink-0" strokeWidth={1.5} />
      <span className={cn("flex-1 text-left", collapsed ? "sr-only" : "max-lg:sr-only")}>{text}</span>
      {hint && <span className={collapsed ? "hidden" : "max-lg:hidden"}>{hint}</span>}
      <Tip side="right" className={collapsed ? "" : "lg:hidden"}>
        {text}
      </Tip>
    </button>
  );
}
