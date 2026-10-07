import { Fragment, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sort } from "remeda";
import { DashboardOnboarding } from "./DashboardOnboarding";
import {
  AuditHealthCard,
  BacklinkPulseCard,
  GscCard,
} from "@/client/features/dashboard/DashboardCards";
import { Ga4Card } from "@/client/features/dashboard/Ga4Card";
import { WorkspaceMergeBanner } from "@/client/features/dashboard/WorkspaceMergeBanner";
import { QueryError } from "@/client/components/QueryState";
import {
  getDashboardActivation,
  getDashboardOverview,
  refreshDashboardBacklinkSnapshot,
} from "@/serverFunctions/dashboard";
import { Skeleton } from "@/client/components/ui/skeleton";

export function DashboardPage({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();

  const activationQuery = useQuery({
    queryKey: ["dashboardActivation", projectId],
    queryFn: () => getDashboardActivation({ data: { projectId } }),
  });
  const overviewQuery = useQuery({
    queryKey: ["dashboardOverview", projectId],
    queryFn: () => getDashboardOverview({ data: { projectId } }),
    refetchInterval: (query) =>
      query.state.data?.audit?.status === "running" ? 3000 : false,
  });

  const activation = activationQuery.data;
  const overview = overviewQuery.data;

  // Visit-triggered backlink snapshot: fire once per page view when the
  // overview reports a missing or stale snapshot for a project with a domain.
  // The server re-checks freshness, so a stray double-fire costs nothing.
  const refreshMutation = useMutation({
    mutationFn: () => refreshDashboardBacklinkSnapshot({ data: { projectId } }),
    onSuccess: () =>
      void queryClient.invalidateQueries({
        queryKey: ["dashboardOverview", projectId],
      }),
  });
  const refreshFiredRef = useRef(false);
  const needsSnapshot =
    activation?.domain != null &&
    overview !== undefined &&
    (overview.backlinks === null || overview.backlinks.stale);
  useEffect(() => {
    if (!needsSnapshot || refreshFiredRef.current) return;
    refreshFiredRef.current = true;
    refreshMutation.mutate();
  }, [needsSnapshot, refreshMutation]);

  if (activationQuery.isError && !activation) {
    return (
      <div className="px-4 py-4 md:px-6 md:py-6">
        <QueryError
          error={activationQuery.error}
          fallback="Failed to load dashboard"
          onRetry={() => void activationQuery.refetch()}
          isRetrying={activationQuery.isFetching}
        />
      </div>
    );
  }

  // Wait for the overview too: rendering cards from `overview === undefined`
  // flashes their empty states (and reshuffles the data-first sort) once the
  // real data lands. An overview error falls through so the page still loads,
  // with the error in place of the audit and backlink cards.
  if (!activation || overviewQuery.isPending) {
    return (
      <div className="px-4 py-4 md:px-6 md:py-6" aria-busy>
        <div className="mx-auto flex max-w-7xl flex-col gap-5">
          <Skeleton className="h-8 w-52" />
          <Skeleton className="h-36" />
          <div className="grid gap-5 lg:grid-cols-2">
            <Skeleton className="h-44" />
            <Skeleton className="h-44" />
          </div>
        </div>
      </div>
    );
  }

  const showBacklinks = activation.domain !== null;
  const gscConnected = activation.gsc.connected;
  const ga4Connected = activation.ga4.connected;

  // Search Console always renders: connected shows the report, otherwise the
  // connect pitch. It sits ahead of the optional GA4 pitch.
  const cards = [
    {
      key: "gsc",
      hasData: gscConnected,
      node: <GscCard projectId={projectId} connected={gscConnected} />,
    },
    ...(ga4Connected || !activation.ga4.cardDismissedAt
      ? [
          {
            key: "ga4",
            hasData: ga4Connected,
            node: <Ga4Card projectId={projectId} connected={ga4Connected} />,
          },
        ]
      : []),
    ...(overview
      ? [
          {
            key: "audit",
            hasData: overview.audit != null,
            node: (
              <AuditHealthCard projectId={projectId} audit={overview.audit} />
            ),
          },
        ]
      : []),
    ...(overview && showBacklinks
      ? [
          {
            key: "backlinks",
            hasData: overview.backlinks != null || refreshMutation.isPending,
            node: (
              <BacklinkPulseCard
                projectId={projectId}
                backlinks={overview.backlinks}
                refreshing={refreshMutation.isPending}
              />
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="px-4 py-4 pb-24 md:px-6 md:py-6 md:pb-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <h1 className="text-2xl font-semibold">Dashboard</h1>

        <WorkspaceMergeBanner />

        <DashboardOnboarding
          key={projectId}
          projectId={projectId}
          activation={activation}
        />

        {activationQuery.isError ? (
          <QueryError
            error={activationQuery.error}
            fallback="Failed to refresh dashboard"
            onRetry={() => void activationQuery.refetch()}
            isRetrying={activationQuery.isFetching}
          />
        ) : null}

        {overviewQuery.isError ? (
          <QueryError
            error={overviewQuery.error}
            fallback="Failed to load site audit and backlink summaries"
            onRetry={() => void overviewQuery.refetch()}
            isRetrying={overviewQuery.isFetching}
          />
        ) : null}

        {/* Every card is half width on large screens (only the checklist spans).
          Cards with data render before setup pitches and empty states. Cards in
          a row stretch to the same height. */}
        <div className="grid gap-5 lg:grid-cols-2">
          {sort(cards, (a, b) => Number(b.hasData) - Number(a.hasData)).map(
            (card) => (
              <Fragment key={card.key}>{card.node}</Fragment>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
