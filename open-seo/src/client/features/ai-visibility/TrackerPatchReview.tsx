import { useId, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, X } from "lucide-react";
import { Button } from "@/client/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/client/components/ui/dialog";
import { Field, FieldLabel } from "@/client/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/client/components/ui/select";
import { Textarea } from "@/client/components/ui/textarea";
import {
  estimateAiVisibilityCost,
  saveAiVisibilityTracker,
} from "@/serverFunctions/ai-visibility";
import type { AiTrackerPatch } from "@/types/schemas/ai-visibility";
import type { AiPrompt, AiTrackerState } from "@/shared/ai-visibility";
import { AiLoading, AiQueryError, aiMoney, aiVisibilityKey } from "./shared";

export function TrackerPatchReview({
  projectId,
  state,
  patch,
  description,
  onClose,
  onSaved,
}: {
  projectId: string;
  state: AiTrackerState;
  patch: AiTrackerPatch;
  description: string;
  onClose: () => void;
  onSaved: (state: AiTrackerState) => void;
}) {
  const estimate = useQuery({
    queryKey: [...aiVisibilityKey(projectId), "changeEstimate", patch],
    queryFn: () => estimateAiVisibilityCost({ data: { projectId, patch } }),
    enabled: Boolean(state.tracker?.enabled),
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
    retry: false,
  });
  const save = useMutation({
    mutationFn: () =>
      saveAiVisibilityTracker({ data: { projectId, ...patch } }),
    onSuccess: (result) => onSaved(result.state),
  });
  const needsEstimate = state.tracker?.enabled;
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !save.isPending) onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg" showCloseButton={false}>
        <DialogHeader className="flex-row items-center justify-between gap-3">
          <DialogTitle className="text-lg">Review tracking change</DialogTitle>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={save.isPending}
            onClick={onClose}
            aria-label="Close review"
          >
            <X />
          </Button>
        </DialogHeader>
        <p className="text-sm">{description}</p>
        {patch.prompts?.map((prompt) => (
          <p
            key={prompt.id ?? prompt.text}
            className="rounded-lg bg-muted/60 p-3 text-sm whitespace-pre-wrap"
            data-ph-mask
          >
            {prompt.text}
          </p>
        ))}
        {needsEstimate && estimate.isPending ? (
          <AiLoading />
        ) : estimate.isError ? (
          <AiQueryError
            error={estimate.error}
            retry={() => {
              void estimate.refetch();
            }}
          />
        ) : (
          <>
            {estimate.data ? (
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>
                  Each run collects {estimate.data.observations} answers for{" "}
                  {aiMoney(estimate.data.costUsd)}
                </p>
                <p>
                  {aiMoney(estimate.data.monthlyCostUsd)} estimated per month on
                  the {estimate.data.scheduleInterval} schedule.
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Tracking is paused. Saving this change does not start a paid
                run.
              </p>
            )}
            {save.error && <AiQueryError error={save.error} />}
            <DialogFooter>
              <Button
                variant="ghost"
                disabled={save.isPending}
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button disabled={save.isPending} onClick={() => save.mutate()}>
                {save.isPending && <Loader2 className="size-4 animate-spin" />}
                Save change
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function PromptEditor({
  prompt,
  state,
  onClose,
  onReview,
}: {
  prompt: AiPrompt;
  state: AiTrackerState;
  onClose: () => void;
  onReview: (patch: AiTrackerPatch) => void;
}) {
  const [text, setText] = useState(prompt.text);
  const [topic, setTopic] = useState(prompt.topic);
  const textId = useId();
  const topicId = useId();
  const topicItems = state.topics.map((name) => ({ value: name, label: name }));
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-xl" showCloseButton={false}>
        <DialogHeader className="flex-row items-center justify-between gap-3">
          <DialogTitle className="text-lg">Edit prompt</DialogTitle>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Close prompt editor"
          >
            <X />
          </Button>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Changing the wording archives this prompt and adds the new wording as
          a new prompt. Earlier answers keep the prompt they were collected for.
        </p>
        <Field>
          <FieldLabel htmlFor={textId}>Exact prompt</FieldLabel>
          <Textarea
            id={textId}
            className="min-h-28"
            value={text}
            onChange={(event) => setText(event.target.value)}
            maxLength={2000}
            data-ph-mask
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={topicId}>Topic</FieldLabel>
          <Select
            items={topicItems}
            value={topic}
            onValueChange={(name) => {
              if (name) setTopic(name);
            }}
          >
            <SelectTrigger id={topicId} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {topicItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={
              !text.trim() || (text === prompt.text && topic === prompt.topic)
            }
            onClick={() =>
              onReview({ prompts: [{ id: prompt.id, text, topic }] })
            }
          >
            Review change
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
