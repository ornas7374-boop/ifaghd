"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Modal } from "@/components/ui/modal";
import { ALL_PAGES } from "@/lib/nav";
import { useApp } from "./app-state";

const GENERAL: [string, string[]][] = [
  ["Command palette", ["⌘", "K"]],
  ["Search", ["/"]],
  ["Create", ["C"]],
  ["Close panel / dialog", ["Esc"]],
  ["Move down / up in lists", ["J", "K"]],
  ["Open focused item", ["↵"]],
  ["Toggle sidebar", ["["]],
  ["Date range: 24h · 7d · 30d · 90d", ["1", "–", "4"]],
  ["Show shortcuts", ["?"]],
];

export function ShortcutsModal() {
  const { shortcutsOpen, setShortcutsOpen } = useApp();
  return (
    <Modal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} label="Keyboard shortcuts" className="max-w-[560px]">
      <div className="flex h-12 items-center border-b border-border px-4">
        <h2 className="flex-1 text-[14px] font-semibold">Keyboard shortcuts</h2>
        <Button variant="ghost" size="icon-sm" onClick={() => setShortcutsOpen(false)} aria-label="Close">
          <X strokeWidth={1.5} />
        </Button>
      </div>
      <div className="grid gap-6 p-4 sm:grid-cols-2">
        <Section title="General" rows={GENERAL} />
        <Section title="Navigation" rows={ALL_PAGES.filter((p) => p.go).map((p) => [`Go to ${p.label}`, ["G", p.go!.toUpperCase()]])} />
      </div>
    </Modal>
  );
}

function Section({ title, rows }: { title: string; rows: [string, string[]][] }) {
  return (
    <div>
      <h3 className="mb-2 text-[11.5px] font-medium text-dim">{title}</h3>
      <ul className="flex flex-col">
        {rows.map(([label, keys]) => (
          <li key={label} className="flex h-8 items-center justify-between gap-3 border-b border-border last:border-0">
            <span className="text-[12.5px] text-muted">{label}</span>
            <Kbd keys={keys} />
          </li>
        ))}
      </ul>
    </div>
  );
}
