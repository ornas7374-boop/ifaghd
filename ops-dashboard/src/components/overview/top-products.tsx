"use client";

import { ShoppingBag } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/states";
import { Badge } from "@/components/ui/status";
import type { Range, TopProduct } from "@/lib/data/types";
import { formatCurrency, formatNumber } from "@/lib/format";

export function TopProducts({ items, loading, range }: { items?: TopProduct[]; loading: boolean; range: Range }) {
  const max = Math.max(1, ...(items ?? []).map((i) => i.revenue));
  return (
    <Card>
      <CardHeader title="Top products" actions={<span className="text-[11.5px] text-dim">{range === "90d" ? "Last 30 days" : `By revenue · ${range}`}</span>} />
      {loading ? (
        <ul aria-busy="true" aria-label="Loading">
          {Array.from({ length: 5 }).map((_, i) => (
            <li key={i} className="flex h-10 items-center gap-3 px-4">
              <Skeleton className="h-3.5 flex-1" />
              <Skeleton className="h-3 w-10" />
              <Skeleton className="h-3 w-20" />
            </li>
          ))}
        </ul>
      ) : !items?.length ? (
        <EmptyState icon={ShoppingBag} title="No products sold yet" body="Your best sellers for this period will be ranked here." />
      ) : (
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="h-8 text-left text-[11.5px] text-dim">
              <th className="pl-4 font-medium">Product</th>
              <th className="w-16 text-right font-medium">Units</th>
              <th className="w-28 text-right font-medium">Revenue</th>
              <th className="hidden w-28 pr-4 text-right font-medium sm:table-cell">Stock</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.sku} className="h-10 border-t border-border">
                <td className="max-w-0 pl-4">
                  <div className="truncate text-fg">{p.name}</div>
                  <div className="mt-1 h-0.5 rounded-full bg-surface-2">
                    <div className="h-full rounded-full bg-accent/70" style={{ width: `${(p.revenue / max) * 100}%` }} />
                  </div>
                </td>
                <td className="tabular text-right text-muted">{formatNumber(p.units)}</td>
                <td className="tabular text-right">{formatCurrency(p.revenue)}</td>
                <td className="hidden pr-4 text-right sm:table-cell">
                  {p.stock < 10 ? <Badge tone="warning" className="normal-case">{p.stock} left</Badge> : <span className="tabular text-muted">{p.stock >= 999 ? "∞" : p.stock}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}
