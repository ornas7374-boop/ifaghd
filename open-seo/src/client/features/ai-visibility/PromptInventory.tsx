import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Archive,
  ChevronDown,
  ChevronRight,
  Pause,
  Pencil,
  Play,
} from "lucide-react";
import {
  AI_ENGINE_LABELS,
  aiNoAnswerLabel,
  type AiEngine,
  type AiObservationRow,
  type AiPrompt,
} from "@/shared/ai-visibility";
import { Button } from "@/client/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui/table";
import { EngineLabel } from "./EngineLabel";
import { aiRate } from "./shared";
import type { AiTrackerPatch } from "@/types/schemas/ai-visibility";

export function PromptInventory({
  projectId,
  prompts,
  topics,
  search,
  engines,
  rows,
  pending,
  onEdit,
  onReduce,
  onReview,
}: {
  projectId: string;
  /** Unarchived prompts; topic pause and archive act on all of them. */
  prompts: AiPrompt[];
  topics: string[];
  search: string;
  engines: AiEngine[];
  rows: AiObservationRow[] | undefined;
  pending: boolean;
  onEdit: (prompt: AiPrompt) => void;
  onReduce: (patch: AiTrackerPatch) => void;
  onReview: (patch: AiTrackerPatch, description: string) => void;
}) {
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const matches = (prompt: AiPrompt) =>
    !search ||
    prompt.text.toLocaleLowerCase().includes(search.toLocaleLowerCase());
  if (!prompts.some(matches))
    return (
      <p className="p-8 text-center text-sm text-muted-foreground">
        No matching prompts. Add prompts or adjust your search.
      </p>
    );
  return (
    <Table className="min-w-[900px]">
      <TableHeader>
        <TableRow>
          <TableHead className="w-full">Prompts by topic</TableHead>
          <TableHead>Engines</TableHead>
          <TableHead>Brand mentions</TableHead>
          <TableHead>Owned citations</TableHead>
          <TableHead>
            <span className="sr-only">Manage tracking</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      {topics.map((topic) => {
        const topicPrompts = prompts.filter((prompt) => prompt.topic === topic);
        const shownPrompts = topicPrompts.filter(matches);
        if (!shownPrompts.length) return null;
        const paused = topicPrompts.every((prompt) => prompt.paused);
        const topicRows = rows?.filter((row) =>
          shownPrompts.some((prompt) => prompt.id === row.promptId),
        );
        const open = !collapsed.includes(topic);
        return (
          <TableBody key={topic}>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableCell colSpan={2} className="py-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex h-auto items-center justify-start gap-2 px-0 text-left hover:bg-transparent aria-expanded:bg-transparent"
                  aria-expanded={open}
                  onClick={() =>
                    setCollapsed((names) =>
                      open
                        ? [...names, topic]
                        : names.filter((name) => name !== topic),
                    )
                  }
                >
                  {open ? <ChevronDown /> : <ChevronRight />}
                  <span className="inline-flex items-center gap-2">
                    {topic}
                    <span className="text-xs font-normal text-muted-foreground">
                      {shownPrompts.length}{" "}
                      {shownPrompts.length === 1 ? "prompt" : "prompts"}
                      {paused ? " · Paused" : ""}
                    </span>
                  </span>
                </Button>
              </TableCell>
              <TableCell>
                <PromptRate rows={topicRows} kind="mentioned" />
              </TableCell>
              <TableCell>
                <PromptRate rows={topicRows} kind="cited" />
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    disabled={pending}
                    title={paused ? "Resume topic" : "Pause topic"}
                    aria-label={`${paused ? "Resume" : "Pause"} topic ${topic}`}
                    onClick={() => {
                      const patch = {
                        prompts: topicPrompts.map((prompt) => ({
                          id: prompt.id,
                          text: prompt.text,
                          paused: !paused,
                        })),
                      };
                      if (paused)
                        onReview(patch, `Resume prompts in ${topic}.`);
                      else onReduce(patch);
                    }}
                  >
                    {paused ? (
                      <Play className="size-3.5" />
                    ) : (
                      <Pause className="size-3.5" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    disabled={pending}
                    title="Archive topic; keep prompt history"
                    aria-label={`Archive topic ${topic}`}
                    onClick={() =>
                      onReduce({
                        archivePromptIds: topicPrompts.map(
                          (prompt) => prompt.id,
                        ),
                      })
                    }
                  >
                    <Archive className="size-3.5" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
            {open &&
              shownPrompts.map((prompt) => {
                const promptRows = rows?.filter(
                  (row) => row.promptId === prompt.id,
                );
                return (
                  <TableRow key={prompt.id}>
                    <TableCell className="min-w-72 py-4 pl-10 first:pl-10">
                      <Link
                        to="/p/$projectId/ai-visibility/prompts/$promptId"
                        params={{ projectId, promptId: prompt.id }}
                        className="whitespace-pre-wrap text-sm font-medium underline-offset-4 hover:text-primary hover:underline"
                        data-ph-mask
                      >
                        {prompt.text}
                      </Link>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {prompt.paused ? "Paused" : "Active"} ·{" "}
                        {prompt.branded ? "Branded" : "Non-branded"}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex min-w-64 items-center gap-3">
                        {engines.map((engine) => (
                          <EngineResult
                            key={engine}
                            engine={engine}
                            row={promptRows?.find(
                              (row) => row.engine === engine,
                            )}
                          />
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <PromptRate rows={promptRows} kind="mentioned" />
                    </TableCell>
                    <TableCell>
                      <PromptRate rows={promptRows} kind="cited" />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          title="Edit prompt"
                          aria-label={`Edit ${prompt.text}`}
                          onClick={() => onEdit(prompt)}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          disabled={pending}
                          title={
                            prompt.paused ? "Resume prompt" : "Pause prompt"
                          }
                          aria-label={`${prompt.paused ? "Resume" : "Pause"} ${prompt.text}`}
                          onClick={() => {
                            const patch = {
                              prompts: [
                                {
                                  id: prompt.id,
                                  text: prompt.text,
                                  paused: !prompt.paused,
                                },
                              ],
                            };
                            if (prompt.paused)
                              onReview(
                                patch,
                                "Resume this prompt in your tracker.",
                              );
                            else onReduce(patch);
                          }}
                        >
                          {prompt.paused ? (
                            <Play className="size-3.5" />
                          ) : (
                            <Pause className="size-3.5" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          disabled={pending}
                          title="Archive prompt; keep history"
                          aria-label={`Archive ${prompt.text}`}
                          onClick={() =>
                            onReduce({ archivePromptIds: [prompt.id] })
                          }
                        >
                          <Archive className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        );
      })}
    </Table>
  );
}

function PromptRate({
  rows,
  kind,
}: {
  rows: AiObservationRow[] | undefined;
  kind: "mentioned" | "cited";
}) {
  const eligible =
    rows?.filter(
      (row) =>
        row.answerStatus === "answered" &&
        row.brands.some((brand) => brand.own),
    ) ?? [];
  const count = eligible.filter((row) =>
    row.brands.some((brand) => brand.own && brand[kind]),
  ).length;
  return (
    <span
      className="flex flex-col text-sm tabular-nums"
      title={
        rows
          ? `${count} of ${eligible.length} eligible answers`
          : "No results available"
      }
    >
      {aiRate(count, eligible.length)}
      {eligible.length > 0 && (
        <span className="text-xs text-muted-foreground">
          {count} of {eligible.length}
        </span>
      )}
    </span>
  );
}

function EngineResult({
  engine,
  row,
}: {
  engine: AiEngine;
  row: AiObservationRow | undefined;
}) {
  const own = row?.brands.find((brand) => brand.own);
  const result = !row
    ? "No result available"
    : row.status === "failed"
      ? "Failed"
      : row.status === "pending"
        ? "Running"
        : row.answerStatus === "no_answer"
          ? aiNoAnswerLabel(engine)
          : row.answerStatus !== "answered"
            ? "Answer unavailable"
            : own?.mentioned
              ? "Mentioned"
              : "Not mentioned";
  return (
    <span
      title={`${AI_ENGINE_LABELS[engine]}: ${result}`}
      className={`inline-flex h-6 items-center text-xs ${result === "Mentioned" ? "text-success" : result === "Failed" ? "text-destructive" : "text-muted-foreground"}`}
    >
      <EngineLabel engine={engine} />
    </span>
  );
}
