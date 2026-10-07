import { ProjectRepository } from "@/server/features/projects/repositories/ProjectRepository";
import { sort } from "remeda";
import type { BillingCustomerContext } from "@/server/billing/subscription";
import { ActivationRepository } from "@/server/features/activation/repositories/ActivationRepository";
import { AuditRepository } from "@/server/features/audit/repositories/AuditRepository";
import { getIssueTypePageCountsForAudit } from "@/server/features/audit/repositories/auditSummaryQueries";
import { BacklinkSnapshotRepository } from "@/server/features/dashboard/repositories/BacklinkSnapshotRepository";
import { Ga4ConnectionRepository } from "@/server/features/ga4/repositories/Ga4ConnectionRepository";
import { GscConnectionRepository } from "@/server/features/gsc/repositories/GscConnectionRepository";
import {
  createDataforseoClient,
  normalizeBacklinksTarget,
} from "@/server/lib/dataforseo";
import { asAppError } from "@/server/lib/errors";
import { shouldCaptureAppErrorCode } from "@/shared/error-codes";

// Daily cadence: fresh numbers each visit without per-visit spend; a dormant
// project costs nothing because refreshes are visit-triggered.
const SNAPSHOT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type DashboardActivation = {
  domain: string | null;
  ga4: {
    connected: boolean;
    propertyDisplayName: string | null;
    cardDismissedAt: string | null;
  };
  gsc: { connected: boolean; siteUrl: string | null };
  mcp: {
    authorizedAt: string | null;
    firstToolCallAt: string | null;
    cardDismissedAt: string | null;
  };
  competitorClickedAt: string | null;
  keywordsClickedAt: string | null;
  hasAudit: boolean;
  hasMultipleProjects: boolean;
  hasTeammate: boolean;
  dismissedSteps: string[];
};

export type DashboardAuditSummary = {
  status: "running" | "completed" | "failed";
  pagesCrawled: number;
  startedAt: string;
  // Top issue types by severity then affected-page count, for the card's list.
  topIssues: {
    issueType: string;
    severity: "critical" | "warning" | "info";
    count: number;
  }[];
  totalIssueTypes: number;
};

export type DashboardBacklinkSummary = {
  domain: string;
  rank: number | null;
  backlinks: number | null;
  referringDomains: number | null;
  newBacklinks: number | null;
  lostBacklinks: number | null;
  newReferringDomains: number | null;
  lostReferringDomains: number | null;
  capturedAt: string;
  stale: boolean;
};

type DashboardOverview = {
  audit: DashboardAuditSummary | null;
  backlinks: DashboardBacklinkSummary | null;
};

async function getActivation(input: {
  userId: string;
  projectId: string;
  organizationId: string;
  domain: string | null;
}): Promise<DashboardActivation> {
  const [
    ga4,
    gsc,
    orgActivation,
    projectActivation,
    projectCount,
    hasTeammate,
    dismissed,
    latestAudit,
  ] = await Promise.all([
    Ga4ConnectionRepository.getByProjectId(input.projectId),
    GscConnectionRepository.getByProjectId(input.projectId),
    ActivationRepository.getOrganizationActivation(input.organizationId),
    ActivationRepository.getProjectActivation(input.projectId),
    ProjectRepository.countProjects(input.organizationId),
    ActivationRepository.hasTeammate(input.organizationId),
    ActivationRepository.getDismissedSteps(input.userId, input.projectId),
    AuditRepository.getLatestAuditForProject(input.projectId),
  ]);

  return {
    domain: input.domain,
    hasMultipleProjects: projectCount > 1,
    hasTeammate,
    dismissedSteps: dismissed.map((row) => row.step),
    ga4: {
      connected: ga4 !== null,
      propertyDisplayName: ga4?.propertyDisplayName ?? null,
      cardDismissedAt: projectActivation?.ga4CardDismissedAt ?? null,
    },
    gsc: { connected: gsc !== null, siteUrl: gsc?.siteUrl ?? null },
    mcp: {
      authorizedAt: orgActivation?.firstMcpAuthorizedAt ?? null,
      firstToolCallAt: orgActivation?.firstMcpToolCallAt ?? null,
      cardDismissedAt: projectActivation?.mcpCardDismissedAt ?? null,
    },
    competitorClickedAt: projectActivation?.competitorStepClickedAt ?? null,
    keywordsClickedAt: projectActivation?.keywordStepClickedAt ?? null,
    hasAudit: latestAudit != null,
  };
}

async function getOverview(input: {
  projectId: string;
  domain: string | null;
}): Promise<DashboardOverview> {
  const [audit, backlinks] = await Promise.all([
    getAuditSummary(input.projectId),
    getBacklinkSummary(input.projectId, input.domain),
  ]);
  return { audit, backlinks };
}

async function getAuditSummary(
  projectId: string,
): Promise<DashboardAuditSummary | null> {
  const audit = await AuditRepository.getLatestAuditForProject(projectId);
  if (!audit) return null;

  const typeRows = await getIssueTypePageCountsForAudit(audit.id);

  const severityRank = { critical: 0, warning: 1, info: 2 };
  const sorted = sort(
    typeRows.map((row) => ({
      issueType: row.issueType,
      severity: row.severity,
      count: row.pages,
    })),
    (a, b) =>
      severityRank[a.severity] - severityRank[b.severity] || b.count - a.count,
  );

  return {
    status: audit.status,
    pagesCrawled: audit.pagesCrawled,
    startedAt: audit.startedAt,
    topIssues: sorted.slice(0, 3),
    totalIssueTypes: sorted.length,
  };
}

function isSnapshotFresh(capturedAt: string): boolean {
  const capturedMs = Date.parse(capturedAt);
  if (Number.isNaN(capturedMs)) return false;
  return Date.now() - capturedMs < SNAPSHOT_MAX_AGE_MS;
}

async function getBacklinkSummary(
  projectId: string,
  domain: string | null,
): Promise<DashboardBacklinkSummary | null> {
  if (!domain) return null;
  const snapshot =
    await BacklinkSnapshotRepository.getLatestForProject(projectId);
  if (!snapshot || snapshot.domain !== domain) return null;
  return {
    domain: snapshot.domain,
    rank: snapshot.rank,
    backlinks: snapshot.backlinks,
    referringDomains: snapshot.referringDomains,
    newBacklinks: snapshot.newBacklinks,
    lostBacklinks: snapshot.lostBacklinks,
    newReferringDomains: snapshot.newReferringDomains,
    lostReferringDomains: snapshot.lostReferringDomains,
    capturedAt: snapshot.capturedAt,
    stale: !isSnapshotFresh(snapshot.capturedAt),
  };
}

/**
 * Visit-triggered snapshot refresh. Fetches only the DataForSEO backlinks
 * summary (not the history endpoint the backlinks page also pays for) and is
 * a no-op while the latest snapshot for the current domain is under a day
 * old. Concurrent loads racing the freshness check can each pay a metered
 * call — every call is metered, so the race duplicates customer spend on
 * identical data but never leaks revenue; accepted for now. On a fetch
 * failure with a stale snapshot in hand, the stale snapshot is returned
 * rather than surfacing an error card.
 */
async function ensureBacklinkSnapshot(input: {
  projectId: string;
  domain: string | null;
  billingCustomer: BillingCustomerContext;
}): Promise<DashboardBacklinkSummary | null> {
  const { projectId, domain } = input;
  if (!domain) return null;

  const latest =
    await BacklinkSnapshotRepository.getLatestForProject(projectId);
  const latestMatchesDomain = latest !== null && latest.domain === domain;
  if (latest && latestMatchesDomain && isSnapshotFresh(latest.capturedAt)) {
    return getBacklinkSummary(projectId, domain);
  }

  // Dashboard totals cover the whole site, subdomains included.
  const normalized = normalizeBacklinksTarget(domain, { scope: "subdomains" });
  const dataforseo = createDataforseoClient(input.billingCustomer);

  try {
    const summary = await dataforseo.backlinks.summary({
      target: normalized.apiTarget,
      includeSubdomains: normalized.includeSubdomains,
    });
    await BacklinkSnapshotRepository.insert({
      projectId,
      domain,
      rank: summary.rank ?? null,
      backlinks: summary.backlinks ?? null,
      referringDomains: summary.referring_domains ?? null,
      brokenBacklinks: summary.broken_backlinks ?? null,
      newBacklinks: summary.new_backlinks ?? null,
      lostBacklinks: summary.lost_backlinks ?? null,
      newReferringDomains:
        summary.new_referring_domains ?? summary.new_reffering_domains ?? null,
      lostReferringDomains:
        summary.lost_referring_domains ??
        summary.lost_reffering_domains ??
        null,
      capturedAt: new Date().toISOString(),
    });
  } catch (error) {
    if (!latestMatchesDomain) throw error;
    // Visit-triggered refresh, so an out-of-credits org re-hits this on every
    // dashboard load. Expected refusals are not failures: log them at info with
    // the code, and keep error for anything the taxonomy says is reportable.
    const code = asAppError(error)?.code;
    if (shouldCaptureAppErrorCode(code)) {
      console.error(
        "dashboard: backlink snapshot refresh failed",
        { projectId },
        error,
      );
    } else {
      console.info("dashboard: backlink snapshot refresh skipped", {
        projectId,
        code,
      });
    }
    return getBacklinkSummary(projectId, domain);
  }

  return getBacklinkSummary(projectId, domain);
}

export const DashboardService = {
  setStepDismissed: ActivationRepository.setStepDismissed,
  getActivation,
  getOverview,
  ensureBacklinkSnapshot,
};
