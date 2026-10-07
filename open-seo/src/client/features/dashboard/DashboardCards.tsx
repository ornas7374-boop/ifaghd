import { CardShell } from "@/client/components/CardShell";
import { Button } from "@/client/components/ui/button";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { GoogleConnectionCard } from "@/client/features/integrations/GoogleConnectionCard";
import { AUDIT_ISSUE_TYPES } from "@/shared/audit-issues";

import {
  formatCount,
  formatCtr,
  formatPosition,
} from "@/client/features/search-performance/SearchPerformanceColumns";
import { getSearchPerformanceReport } from "@/serverFunctions/searchPerformance";
import {
  EmptyCardBody,
  formatDay,
  moreDetailsClass,
  newLost,
  StatGridSkeleton,
} from "@/client/features/dashboard/cardParts";
import { StatTile } from "@/client/components/StatTile";
import type {
  DashboardAuditSummary,
  DashboardBacklinkSummary,
} from "@/server/features/dashboard/services/DashboardService";

// Plain string-keyed view of the registry: issue types from the DB are not
// statically guaranteed to be registry keys.
const issueTitles: Record<string, string | undefined> = Object.fromEntries(
  Object.entries(AUDIT_ISSUE_TYPES).map(([key, value]) => [key, value.title]),
);

export function GscCard({
  projectId,
  connected,
}: {
  projectId: string;
  connected: boolean;
}) {
  const reportQuery = useQuery({
    queryKey: ["dashboardGscReport", projectId],
    queryFn: () =>
      getSearchPerformanceReport({
        data: { projectId, dateRange: "last_28_days" },
      }),
    enabled: connected,
  });
  const report = reportQuery.data;

  // Not connected (or a dead grant discovered by the report call): the
  // connection card sells and runs the whole flow itself.
  if (!connected || (report && !report.connected)) {
    return (
      <div id="connect-gsc">
        <GoogleConnectionCard provider="gsc" projectId={projectId} prominent />
      </div>
    );
  }

  return (
    <CardShell
      title="Search performance"
      stamp="Google Search Console · last 28 days"
      action={
        <Link
          to="/p/$projectId/search-performance"
          params={{ projectId }}
          className={moreDetailsClass}
        >
          More details
        </Link>
      }
    >
      {reportQuery.isError ? (
        <p className="text-sm text-muted-foreground">
          Couldn&rsquo;t load Search Console data. Try again shortly.
        </p>
      ) : !report ? (
        <StatGridSkeleton />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <StatTile
            label="Clicks"
            value={formatCount(report.totals.clicks)}
            delta={{
              current: report.totals.clicks,
              previous: report.prevTotals.clicks,
            }}
          />
          <StatTile
            label="Impressions"
            value={formatCount(report.totals.impressions)}
            delta={{
              current: report.totals.impressions,
              previous: report.prevTotals.impressions,
            }}
          />
          <StatTile label="CTR" value={formatCtr(report.totals.ctr)} />
          <StatTile
            label="Avg position"
            value={formatPosition(report.totals.position)}
          />
        </div>
      )}
    </CardShell>
  );
}

export function AuditHealthCard({
  projectId,
  audit,
}: {
  projectId: string;
  audit: DashboardAuditSummary | null;
}) {
  if (!audit) {
    return (
      <CardShell title="Site audit">
        <EmptyCardBody
          message="Crawl your site for broken links, missing tags and indexability problems."
          cta={
            <Button
              size="lg"
              nativeButton={false}
              render={<Link to="/p/$projectId/audit" params={{ projectId }} />}
            >
              Run an audit
            </Button>
          }
        />
      </CardShell>
    );
  }

  return (
    <CardShell
      title="Site audit"
      stamp={`Site audit · ${
        audit.status === "completed"
          ? `crawled ${audit.pagesCrawled} pages · ${formatDay(audit.startedAt)}`
          : audit.status === "running"
            ? "crawl in progress"
            : "last crawl failed"
      }`}
      action={
        <Link
          to="/p/$projectId/audit"
          params={{ projectId }}
          className={moreDetailsClass}
        >
          More details
        </Link>
      }
    >
      {audit.status === "running" ? (
        // A running crawl has at most a partial issue list, and an empty one
        // is not the same as a healthy site.
        <p className="text-sm text-muted-foreground">
          Issues appear here when the crawl finishes.
        </p>
      ) : audit.topIssues.length === 0 ? (
        audit.status === "completed" ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Check className="size-4 text-success" />
            No issues found — your site looks healthy.
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Run the audit again to see issues.
          </p>
        )
      ) : (
        <ul className="space-y-2">
          {audit.topIssues.map((issue) => (
            <li
              key={issue.issueType}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className={`size-2 shrink-0 rounded-full ${
                    issue.severity === "critical"
                      ? "bg-destructive"
                      : issue.severity === "warning"
                        ? "bg-warning"
                        : "bg-muted-foreground/30"
                  }`}
                />
                <span className="truncate">
                  {issueTitles[issue.issueType] ?? issue.issueType}
                </span>
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {issue.count} {issue.count === 1 ? "page" : "pages"}
              </span>
            </li>
          ))}
          {audit.totalIssueTypes > audit.topIssues.length ? (
            <li className="text-xs text-muted-foreground">
              + {audit.totalIssueTypes - audit.topIssues.length} more issue
              {audit.totalIssueTypes - audit.topIssues.length === 1 ? "" : "s"}
            </li>
          ) : null}
          {/* A failed crawl keeps what it found, as the audit page does. */}
          {audit.status !== "completed" ? (
            <li className="text-xs text-muted-foreground">
              From the pages crawled before the audit stopped.
            </li>
          ) : null}
        </ul>
      )}
    </CardShell>
  );
}

export function BacklinkPulseCard({
  projectId,
  backlinks,
  refreshing,
}: {
  projectId: string;
  backlinks: DashboardBacklinkSummary | null;
  refreshing: boolean;
}) {
  if (!backlinks && refreshing) {
    return (
      <CardShell title="Backlink pulse" stamp="Taking your first snapshot…">
        <StatGridSkeleton />
      </CardShell>
    );
  }

  if (!backlinks) {
    return (
      <CardShell title="Backlink pulse">
        <p className="text-sm text-muted-foreground">
          We&rsquo;ll snapshot who links to your domain — nothing to set up.
        </p>
      </CardShell>
    );
  }

  return (
    <CardShell
      title="Backlink pulse"
      stamp={`Backlinks · snapshot ${formatDay(backlinks.capturedAt)}${
        refreshing ? " · refreshing…" : ""
      }`}
      action={
        <Link
          to="/p/$projectId/backlinks"
          params={{ projectId }}
          search={{ target: backlinks.domain, scope: "domain" }}
          className={moreDetailsClass}
        >
          More details
        </Link>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <StatTile
          label="Ref. domains"
          value={
            backlinks.referringDomains === null
              ? "—"
              : backlinks.referringDomains.toLocaleString()
          }
        />
        <StatTile
          label="Backlinks"
          value={
            backlinks.backlinks === null
              ? "—"
              : backlinks.backlinks.toLocaleString()
          }
        />
        <StatTile
          label="New links"
          value={`▲ ${newLost(backlinks.newBacklinks)}`}
          tone={
            backlinks.newBacklinks && backlinks.newBacklinks > 0
              ? "success"
              : undefined
          }
        />
        <StatTile
          label="Lost links"
          value={`▼ ${newLost(backlinks.lostBacklinks)}`}
          tone={
            backlinks.lostBacklinks && backlinks.lostBacklinks > 0
              ? "destructive"
              : undefined
          }
        />
      </div>
    </CardShell>
  );
}
