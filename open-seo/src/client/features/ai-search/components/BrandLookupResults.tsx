import { Info, TriangleAlert } from "lucide-react";
import { Alert, AlertTitle } from "@/client/components/ui/alert";
import { Badge } from "@/client/components/ui/badge";
import { Card } from "@/client/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/client/components/ui/tooltip";
import { DomainLevelBadge } from "@/client/features/ai-search/components/DomainLevelBadge";
import { BrandLookupMentionTrendCard } from "@/client/features/ai-search/components/BrandLookupMentionTrendCard";
import { BrandLookupShareOfVoice } from "@/client/features/ai-search/components/BrandLookupShareOfVoice";
import { CitationTabsCard } from "@/client/features/ai-search/components/BrandLookupCitationsCard";
import {
  formatCount,
  formatPlatformLabel,
  PLATFORM_DOT_CLASS,
} from "@/client/features/ai-search/platformLabels";
import type { BrandLookupResult } from "@/types/schemas/ai-search";
import { RESEARCH_SCOPE_LABELS } from "@/shared/researchScope";

type Props = {
  result: BrandLookupResult;
  projectId: string;
};

type PlatformRow = BrandLookupResult["perPlatform"][number];
type MetricKey = "mentions" | "aiSearchVolume";

const DOMAIN_LEVEL_TIP =
  "AI search providers report mentions per domain, not per page. This number covers the whole domain — the cited pages below are limited to your scope.";

export function BrandLookupResults({ result, projectId }: Props) {
  if (!result.hasData) {
    const erroredPlatforms = result.perPlatform.filter(
      (p) => p.status === "error",
    );
    const allPlatformsErrored =
      erroredPlatforms.length === result.perPlatform.length &&
      result.perPlatform.length > 0;

    if (allPlatformsErrored) {
      return (
        <Alert variant="warning">
          <TriangleAlert aria-hidden />
          <AlertTitle className="font-normal">
            AI mention data is temporarily unavailable for{" "}
            <strong>{result.resolvedTarget}</strong>. Please try again shortly.
          </AlertTitle>
        </Alert>
      );
    }
    return (
      <div className="space-y-3">
        <Alert variant="info">
          <Info aria-hidden />
          <AlertTitle className="font-normal">
            No AI mentions found for <strong>{result.resolvedTarget}</strong>.
          </AlertTitle>
        </Alert>
        {erroredPlatforms.length > 0 ? (
          <p className="text-xs text-muted-foreground">
            Note:{" "}
            {erroredPlatforms
              .map((p) => formatPlatformLabel(p.platform))
              .join(" and ")}{" "}
            {erroredPlatforms.length === 1 ? "was" : "were"} unavailable — some
            mentions may be missing.
          </p>
        ) : null}
      </div>
    );
  }

  const hasTrendData = result.monthlyVolume.length > 0;
  const sov = result.shareOfVoice;

  return (
    <Card className="gap-0 py-0">
      <BrandHeader result={result} />

      {/* One shared grid so the panels align by construction: stats left,
          trend right, Share of Voice flowing into the next free half-width
          cell — whichever of trend/SoV is absent, the rest stay
          column-aligned. A lone stats panel keeps full width instead of half a
          grid. */}
      <div
        className={
          hasTrendData || sov
            ? "grid gap-3 px-4 pb-4 lg:grid-cols-2"
            : "px-4 pb-4"
        }
      >
        <StatsCard result={result} />
        {hasTrendData ? <MentionTrendCard result={result} /> : null}
        {sov ? (
          <BrandLookupShareOfVoice
            shareOfVoice={sov}
            isDomainLevel={result.aggregatesAreDomainLevel}
          />
        ) : null}
      </div>

      <div className="px-4 pb-4">
        <CitationTabsCard result={result} projectId={projectId} />
      </div>
    </Card>
  );
}

function BrandHeader({ result }: { result: BrandLookupResult }) {
  return (
    <section className="px-4 pt-4 pb-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold break-all">
          {result.resolvedTarget}
        </h2>
        <Badge variant="secondary">{result.detectedTargetType}</Badge>
        {result.scope ? (
          <Badge variant="outline">{RESEARCH_SCOPE_LABELS[result.scope]}</Badge>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">
        Updated {formatRelative(result.fetchedAt)}
      </p>
    </section>
  );
}

function StatsCard({ result }: { result: BrandLookupResult }) {
  return (
    <div className="rounded-lg border border-border">
      <div className="flex h-full flex-col divide-y divide-border">
        <StatBlock
          label="Mentions"
          tooltip="Estimated count of AI answers where the searched brand or domain appeared in the answer text or cited sources."
          value={result.totalMentions}
          perPlatform={result.perPlatform}
          metric="mentions"
          isDomainLevel={result.aggregatesAreDomainLevel}
        />
        <StatBlock
          label="AI search volume"
          tooltip="Estimated monthly search demand for prompts where the searched brand or domain appears in AI answers. This is prompt demand, not mention count."
          value={result.totalAiSearchVolume}
          perPlatform={result.perPlatform}
          metric="aiSearchVolume"
          isDomainLevel={result.aggregatesAreDomainLevel}
        />
      </div>
    </div>
  );
}

function StatBlock({
  label,
  tooltip,
  value,
  perPlatform,
  metric,
  isDomainLevel,
}: {
  label: string;
  tooltip: string;
  value: number | null;
  perPlatform: PlatformRow[];
  metric: MetricKey;
  isDomainLevel: boolean;
}) {
  return (
    <div className="flex flex-1 flex-col justify-center p-4">
      <div className="inline-flex items-center gap-1 text-xs font-medium tracking-wider text-muted-foreground uppercase">
        {label}
        <InfoTooltip text={tooltip} />
        {isDomainLevel ? <DomainLevelBadge tooltip={DOMAIN_LEVEL_TIP} /> : null}
      </div>
      <p className="mt-1 text-3xl font-semibold tabular-nums">
        {formatCount(value)}
      </p>
      <div className="mt-3 space-y-1 border-t border-border pt-2.5">
        {perPlatform.map((row) => (
          <PlatformStatRow key={row.platform} row={row} metric={metric} />
        ))}
      </div>
    </div>
  );
}

function PlatformStatRow({
  row,
  metric,
}: {
  row: PlatformRow;
  metric: MetricKey;
}) {
  const value = row.status === "error" ? null : row[metric];

  return (
    <div className="flex items-center justify-between text-xs">
      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
        <span
          className={`size-1.5 rounded-full ${PLATFORM_DOT_CLASS[row.platform]}`}
        />
        {formatPlatformLabel(row.platform)}
        {row.platform === "chat_gpt" ? (
          <InfoTooltip text="DataForSEO indexes ChatGPT mentions for US English only — country selection is not available for this platform." />
        ) : null}
        {row.status === "error" ? (
          <span className="text-destructive">unavailable</span>
        ) : null}
      </span>
      <span className="font-medium text-foreground tabular-nums">
        {formatCount(value)}
      </span>
    </div>
  );
}

function MentionTrendCard({ result }: { result: BrandLookupResult }) {
  return (
    <div className="rounded-lg border border-border">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <h3 className="text-sm font-medium">Mention trend (last 12 months)</h3>
        {result.aggregatesAreDomainLevel ? (
          <DomainLevelBadge tooltip={DOMAIN_LEVEL_TIP} />
        ) : null}
      </div>
      <div className="p-4">
        <BrandLookupMentionTrendCard result={result} />
      </div>
    </div>
  );
}

function InfoTooltip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        delay={150}
        aria-label="More info"
        className="inline-flex rounded-sm text-muted-foreground/70 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <Info className="size-3" />
      </TooltipTrigger>
      <TooltipContent className="normal-case tracking-normal font-normal">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

function formatRelative(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "just now";

  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}
