"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Modal } from "@/components/ui/modal";
import { Segmented } from "@/components/ui/segmented";
import { useToast } from "@/components/ui/toast";
import { PRODUCTS } from "@/lib/data/mock";
import { formatCurrency } from "@/lib/format";
import { useApp } from "./app-state";

type Kind = "order" | "customer" | "workflow";

const field = "h-8 w-full rounded-[6px] border border-border bg-surface-2 px-2.5 text-[13px] text-fg outline-none transition-colors placeholder:text-dim hover:border-border-strong focus:border-accent focus:ring-2 focus:ring-accent/25";

export function CreateModal() {
  const { createOpen, setCreateOpen } = useApp();
  const toast = useToast();
  const [kind, setKind] = useState<Kind>("order");
  const [name, setName] = useState("");
  const [sku, setSku] = useState(PRODUCTS[0].sku);
  const [qty, setQty] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setCreateOpen(false);
    setError(null);
  };
  const product = PRODUCTS.find((p) => p.sku === sku)!;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(kind === "workflow" ? "Give the workflow a name." : "Customer name is required.");
      return;
    }
    const label = kind === "order" ? `Order BC-${10_483 + Math.floor(Math.random() * 9)} created` : kind === "customer" ? `${name} added` : `Workflow “${name}” created`;
    close();
    setName("");
    toast({ tone: "success", title: label, description: kind === "order" ? `${qty} × ${product.name} · draft` : undefined, onUndo: () => toast({ tone: "info", title: "Creation undone" }) });
  };

  return (
    <Modal open={createOpen} onClose={close} label="Create">
      <form onSubmit={submit} onKeyDown={(e) => (e.metaKey || e.ctrlKey) && e.key === "Enter" && submit(e)}>
        <div className="flex h-12 items-center gap-3 border-b border-border px-4">
          <h2 className="flex-1 text-[14px] font-semibold">Create</h2>
          <Segmented<Kind>
            label="Record type"
            value={kind}
            onChange={(k) => {
              setKind(k);
              setError(null);
            }}
            options={[
              { value: "order", label: "Order" },
              { value: "customer", label: "Customer" },
              { value: "workflow", label: "Workflow" },
            ]}
          />
          <Button variant="ghost" size="icon-sm" onClick={close} aria-label="Close">
            <X strokeWidth={1.5} />
          </Button>
        </div>
        <div className="flex flex-col gap-4 p-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-medium text-muted">{kind === "workflow" ? "Workflow name" : "Customer name"}</span>
            <input
              autoFocus
              className={field}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              placeholder={kind === "workflow" ? "e.g. Win-back after 60 days" : "e.g. Noura Al-Qahtani"}
              aria-invalid={!!error}
              aria-describedby={error ? "create-error" : undefined}
            />
            {error && (
              <span id="create-error" className="text-[12px] text-danger">
                {error}
              </span>
            )}
          </label>
          {kind === "order" && (
            <div className="grid grid-cols-[1fr_88px] gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-[12px] font-medium text-muted">Product</span>
                <select className={field} value={sku} onChange={(e) => setSku(e.target.value)}>
                  {PRODUCTS.map((p) => (
                    <option key={p.sku} value={p.sku}>
                      {p.name} — {formatCurrency(p.price)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[12px] font-medium text-muted">Qty</span>
                <input type="number" min={1} max={99} className={`${field} tabular`} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} />
              </label>
            </div>
          )}
          {kind === "workflow" && (
            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] font-medium text-muted">Trigger</span>
              <select className={field} defaultValue="order.paid">
                <option value="order.paid">Order paid</option>
                <option value="order.fulfilled">Order fulfilled</option>
                <option value="cart.idle">Cart idle for 45 min</option>
                <option value="stock.low">Stock below threshold</option>
                <option value="whatsapp.message">New WhatsApp message</option>
              </select>
            </label>
          )}
          {kind === "customer" && (
            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] font-medium text-muted">Email</span>
              <input type="email" className={field} placeholder="name@example.com" />
            </label>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-border bg-surface-2/50 px-4 py-3">
          <span className="text-[12px] text-dim">{kind === "order" ? `Total ${formatCurrency(product.price * qty * 1.15)} incl. VAT` : ""}</span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Create {kind}
              <Kbd keys={["⌘", "↵"]} className="ml-1 opacity-80 [&_kbd]:border-white/20 [&_kbd]:bg-white/10 [&_kbd]:text-white" />
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
