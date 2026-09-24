# Relay — Ops dashboard (Bayt Coffee)

An internal operations dashboard for a Saudi specialty-coffee store: orders, customers and automation workflows (n8n, WhatsApp, ZATCA). It's built to be fast, calm and keyboard-first, in the style of Linear, Railway, Resend and Raycast.

**Stack:** Next.js 16 (App Router) · React 19 · Tailwind v4 (CSS-variable theme) · Recharts · Lucide

```bash
cd ops-dashboard
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
```

## What's built (phase 1)

| Area | Details |
|---|---|
| **App shell** | 240px sidebar (collapses to a 56px rail with `[`; forced rail on tablet), workspace switcher, grouped nav with live count badges, account menu with theme toggle. Top bar: breadcrumbs, date-range picker, notifications, **+ New**. Bottom tab bar on mobile. |
| **Command palette** | `⌘K` / `Ctrl+K` / `/`: fuzzy search across pages, actions, workflows, ~300 orders and customers. Groups are ranked by best match, with recent items and keycap hints. |
| **Overview** | 5 KPI cards (count-up once, delta vs previous period, sparkline; clicking one switches the chart metric). Main chart with Revenue/Orders/Visitors tabs, 24h–90d range, a dashed previous-period comparison and a crosshair tooltip. Needs attention (optimistic actions + undo, J/K navigation), Top products, Recent activity, Systems status. |
| **Detail panels** | `?order=BC-10482` or `?workflow=wf_invoice_zatca` opens a 480px side panel from any page: properties, line items, timeline, related orders, optimistic Fulfill/Refund/Enable with undo. |
| **States** | Layout-matched skeletons, empty states (icon + one line + CTA), one inline error with Retry, toasts with Undo. |
| **Themes** | Dark by default. Light theme via `<html data-theme="light">`, persisted, with no flash on load. |

### Demo switches
Append these to any URL: `?simulate=error` · `?simulate=empty` · `?simulate=slow`

### Keyboard
`⌘K` palette · `/` search · `C` create · `G` then `O/R/C/N/A/L/S` to jump to a page · `1–4` date range · `J/K` move in lists · `Esc` close · `[` sidebar · `?` all shortcuts

## URL state
`range`, `metric`, `order`, `workflow` and `simulate` all live in the query string, so any view is a shareable link. Writes use `router.replace`, so they don't flood browser history.

## Plugging in the real API
Everything goes through **`src/lib/data/api.ts`**. Components never import mock data directly (the one exception is the product list in the create modal).

| Function | Replace with |
|---|---|
| `getOverview(range)` | `GET /api/overview?range=30d` → `OverviewData` (types in `lib/data/types.ts`) |
| `getOrder(id)` / `getWorkflow(id)` | `GET /api/orders/:id`, `GET /api/workflows/:id` |
| `runAction(action, id)` | `POST /api/actions` (retry, approve refund, reorder, enable…) |
| `searchIndex()` | `GET /api/search?q=` (debounced) once records exceed a few thousand |

`useQuery` (`lib/hooks/use-query.ts`) is a small stale-while-revalidate cache. Swap it for TanStack Query when mutations and invalidation get richer; the call sites stay nearly the same.

## Structure
```
src/
  app/                 routes (Overview live; other pages are "next up" stubs)
  components/ui/       Button, Kbd, Badge/StatusDot, Avatar(+Stack), Popover/Menu, Modal,
                       SidePanel, Toast, Segmented, Toggle, Tooltip, Skeleton, Empty/Error states
  components/shell/    Sidebar, Topbar, CommandPalette, CreateModal, ShortcutsModal,
                       RecordPanels, MobileNav, AppShell (global hotkeys)
  components/overview/ KPI cards, main chart, needs attention, activity, top products, systems
  lib/data/            types, seeded mock generator, api layer
  lib/hooks/           URL state, query cache, hotkeys, count-up, shared clock
```
