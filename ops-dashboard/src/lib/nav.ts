import {
  BarChart3,
  Home,
  Package,
  ScrollText,
  Settings,
  Users,
  Workflow,
  History,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Second key of the "G then X" sequence */
  go?: string;
  badge?: "pendingOrders" | "failingWorkflows";
}

export const PRIMARY: NavItem[] = [{ href: "/", label: "Overview", icon: Home, go: "o" }];

export const GROUPS: { id: string; label: string; items: NavItem[] }[] = [
  {
    id: "workspace",
    label: "Workspace",
    items: [
      { href: "/orders", label: "Orders", icon: Package, go: "r", badge: "pendingOrders" },
      { href: "/customers", label: "Customers", icon: Users, go: "c" },
      { href: "/analytics", label: "Analytics", icon: BarChart3, go: "n" },
    ],
  },
  {
    id: "automations",
    label: "Automations",
    items: [
      { href: "/automations", label: "Workflows", icon: Workflow, go: "a", badge: "failingWorkflows" },
      { href: "/automations/runs", label: "Run history", icon: History },
      { href: "/automations/logs", label: "Logs", icon: ScrollText, go: "l" },
    ],
  },
];

export const SETTINGS: NavItem = { href: "/settings", label: "Settings", icon: Settings, go: "s" };

export const ALL_PAGES: NavItem[] = [...PRIMARY, ...GROUPS.flatMap((g) => g.items), SETTINGS];

export function pageFor(pathname: string) {
  return (
    ALL_PAGES.filter((p) => (p.href === "/" ? pathname === "/" : pathname.startsWith(p.href))).sort((a, b) => b.href.length - a.href.length)[0] ??
    PRIMARY[0]
  );
}

export function groupFor(pathname: string) {
  return GROUPS.find((g) => g.items.some((i) => pathname.startsWith(i.href)));
}
