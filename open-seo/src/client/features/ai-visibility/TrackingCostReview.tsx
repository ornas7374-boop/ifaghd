import { useState } from "react";
import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { FormDialog } from "@/client/components/FormDialog";
import { Button } from "@/client/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/client/components/ui/field";
import {
  estimateAiVisibilityCost,
  runAiVisibilityCheck,
  setAiVisibilitySchedule,
} from "@/serverFunctions/ai-visibility";
import type {
  AiRun,
  AiScheduleInterval,
  AiTracker,
} from "@/shared/ai-visibility";
import { ScheduleField } from "@/client/features/rank-tracking/ScheduleField";
import {
  localScheduleTimeFrom,
  randomScheduleDate,
  withBrowserTimeZone,
} from "@/client/features/rank-tracking/scheduleTime";
import { AiLoading, AiQueryError, aiMoney, aiVisibilityKey } from "./shared";

export function TrackingCostReview({
  projectId,
  tracker,
  mode,
  promptIds,
  onClose,
  onStarted,
}: {
  projectId: string;
  tracker: AiTracker;
  mode: "check" | "schedule";
  promptIds?: string[];
  onClose: () => void;
  onStarted: (run: AiRun | null) => void;
}) {
  const [scheduleInterval, setScheduleInterval] = useState<AiScheduleInterval>(
    tracker.scheduleInterval,
  );
  // Shown and edited in the browser's timezone; the server converts it to UTC.
  const [scheduleTime, setScheduleTime] = useState(() =>
    localScheduleTimeFrom(
      tracker.enabled && tracker.nextCheckAt
        ? new Date(tracker.nextCheckAt)
        : randomScheduleDate(),
    ),
  );
  const [scheduleTimeEdited, setScheduleTimeEdited] = useState(false);
  const estimate = useQuery({
    queryKey: [
      ...aiVisibilityKey(projectId),
      "estimate",
      mode,
      scheduleInterval,
      promptIds,
    ],
    queryFn: () =>
      estimateAiVisibilityCost({
        data: {
          projectId,
          promptIds,
          scheduleInterval: mode === "schedule" ? scheduleInterval : undefined,
        },
      }),
    placeholderData: keepPreviousData,
    // Price the tracker as it is now each time the dialog opens.
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const cost = estimate.data;
  const start = useMutation({
    mutationFn: async () => {
      if (!cost) throw new Error("Review the estimate before starting.");
      if (mode === "schedule") {
        const result = await setAiVisibilitySchedule({
          data: {
            projectId,
            enabled: true,
            scheduleInterval,
            // An unchanged schedule keeps its next check.
            scheduleTime:
              !tracker.enabled ||
              scheduleTimeEdited ||
              scheduleInterval !== tracker.scheduleInterval
                ? withBrowserTimeZone(scheduleTime)
                : undefined,
          },
        });
        return result.run;
      }
      return runAiVisibilityCheck({
        data: {
          projectId,
          maxCostUsd: cost.costUsd,
          promptIds,
        },
      });
    },
    onSuccess: onStarted,
  });

  return (
    <FormDialog
      title={
        mode === "check"
          ? "Run now"
          : tracker.enabled
            ? "Change tracking schedule"
            : "Schedule tracking"
      }
      onClose={() => {
        if (!start.isPending) onClose();
      }}
      actions={
        <>
          <Button variant="ghost" disabled={start.isPending} onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={
              !cost ||
              estimate.isPlaceholderData ||
              start.isPending ||
              cost.observations === 0
            }
            onClick={() => start.mutate()}
          >
            {start.isPending && <Loader2 className="size-4 animate-spin" />}
            {mode === "check"
              ? "Run now"
              : tracker.enabled
                ? "Save schedule"
                : "Start tracking"}
          </Button>
        </>
      }
    >
      {estimate.isPending ? (
        <AiLoading />
      ) : estimate.isError ? (
        <AiQueryError
          error={estimate.error}
          retry={() => {
            void estimate.refetch();
          }}
        />
      ) : (
        cost && (
          <>
            {mode === "schedule" && (
              <ScheduleField
                allowManual={false}
                schedule={scheduleInterval}
                onScheduleChange={(value) => {
                  if (value !== "manual") setScheduleInterval(value);
                }}
                scheduleTime={scheduleTime}
                onScheduleTimeChange={(time) => {
                  setScheduleTime(time);
                  setScheduleTimeEdited(true);
                }}
              />
            )}
            <Field>
              <FieldLabel>
                {mode === "schedule" ? "Cost per run" : "Cost"}
              </FieldLabel>
              <span className="text-2xl font-semibold tabular-nums">
                {aiMoney(cost.costUsd)}
              </span>
              <FieldDescription>
                {`${cost.observations} ${cost.observations === 1 ? "answer" : "answers"} × ${aiMoney(cost.observations ? cost.costUsd / cost.observations : 0)}${mode === "schedule" ? ` · about ${aiMoney(cost.monthlyCostUsd)} a month (${cost.checksPerMonth} ${cost.checksPerMonth === 1 ? "run" : "runs"})` : ""}`}
              </FieldDescription>
            </Field>
            {start.error && <AiQueryError error={start.error} />}
          </>
        )
      )}
    </FormDialog>
  );
}
