import { Info } from "lucide-react";
import { Alert, AlertDescription } from "@/client/components/ui/alert";
import { Badge } from "@/client/components/ui/badge";
import { RESEARCH_SCOPE_LABELS } from "@/shared/researchScope";
import { HelpLabel } from "@/client/components/HelpLabel";
import {
  BacklinksNewLostChart,
  BacklinksTrendChart,
} from "./BacklinksPageCharts";
import type { BacklinksOverviewData } from "./backlinksPageTypes";
import { formatRelativeTimestamp } from "./backlinksPageUtils";

type SummaryStat = { label: string; value: string; description: string };

const SCOPE_NOTES: Partial<Record<BacklinksOverviewData["scope"], string>> = {
  exact_url:
    "Showing backlinks for this exact page. Switch the scope to Domain or Subdomains for site-wide results — trend charts need one of those.",
  subfolder:
    "Showing backlinks pointing into this subfolder. Counts come from filtered backlink totals; rank, trends, and the referring-domains breakdown need Domain or Subdomains scope.",
};

export function BacklinksScopeAlert({
  scope,
}: {
  scope: BacklinksOverviewData["scope"];
}) {
  const note = SCOPE_NOTES[scope];
  if (!note) return null;
  return (
    <Alert variant="info">
      <Info />
      <AlertDescription className="text-foreground">{note}</AlertDescription>
    </Alert>
  );
}

/** The header and overview sections at the top of the results card. */
export function BacklinksOverviewPanels({
  data,
  summaryStats,
}: {
  data: BacklinksOverviewData;
  summaryStats: SummaryStat[];
}) {
  return (
    <>
      <div className="px-4 pt-4 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold break-all">
            {data.displayTarget}
          </h2>
          <Badge variant="outline">{RESEARCH_SCOPE_LABELS[data.scope]}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Updated {formatRelativeTimestamp(data.fetchedAt)} &middot; Overview
          metrics cover the full target, before table filters
          {/* history/live can't exclude subdomains, so say so rather than
              imply the charts match the domain-scoped totals. */}
          {data.scope === "domain" ? (
            <> &middot; Trends include subdomains</>
          ) : null}
        </p>
      </div>
      <div className="px-4 pb-4">
        <OverviewGrid data={data} summaryStats={summaryStats} />
      </div>
    </>
  );
}

function OverviewGrid({
  data,
  summaryStats,
}: {
  data: BacklinksOverviewData;
  summaryStats: SummaryStat[];
}) {
  // Trend charts need history/live, which only takes a whole hostname.
  const domainScope = data.scope === "domain" || data.scope === "subdomains";

  return (
    <div
      className={`grid grid-cols-1 gap-3 ${domainScope ? "md:grid-cols-2 xl:grid-cols-3" : ""}`}
    >
      <div
        className={`rounded-lg border border-border p-3 ${domainScope ? "md:col-span-2 xl:col-span-1" : ""}`}
      >
        <div
          className={`grid grid-cols-2 gap-x-6 gap-y-5 xl:gap-y-6 ${domainScope ? "" : "md:grid-cols-4"}`}
        >
          {summaryStats.map((item) => (
            <div key={item.label}>
              <div className="text-xs tracking-wide text-muted-foreground uppercase">
                <HelpLabel label={item.label} helpText={item.description} />
              </div>
              <p className="text-2xl font-semibold">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
      {domainScope ? (
        <>
          <TrendPanel
            title="Backlink growth"
            description="Backlinks and referring domains over the last year"
          >
            <BacklinksTrendChart data={data.trends} />
          </TrendPanel>
          <TrendPanel
            title="New vs lost"
            description="Backlink acquisition and attrition"
          >
            <BacklinksNewLostChart data={data.newLostTrends} />
          </TrendPanel>
        </>
      ) : null}
    </div>
  );
}

function TrendPanel({
  children,
  description,
  title,
}: {
  children: React.ReactNode;
  description: string;
  title: string;
}) {
  return (
    <div className="space-y-2 rounded-lg border border-border p-3">
      <div>
        <h3 className="text-sm font-medium">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}
