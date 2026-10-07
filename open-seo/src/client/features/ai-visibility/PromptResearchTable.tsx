import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { SafeExternalLink } from "@/client/components/SafeExternalLink";
import { Badge } from "@/client/components/ui/badge";
import { Button } from "@/client/components/ui/button";
import { Checkbox } from "@/client/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui/table";
import type { AiResearchedPrompt } from "@/shared/ai-visibility";
import { DomainFavicon } from "./DomainFavicon";

export function PromptResearchTable({
  prompts,
  selected,
  onToggle,
}: {
  prompts: AiResearchedPrompt[];
  selected: Set<string>;
  onToggle: (text: string) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10" />
          <TableHead>Prompt</TableHead>
          <TableHead className="w-40">Sources</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {prompts.map((prompt) => (
          <PromptRow
            key={prompt.text}
            prompt={prompt}
            selected={selected.has(prompt.text)}
            expanded={expanded === prompt.text}
            onToggle={() => onToggle(prompt.text)}
            onExpand={() =>
              setExpanded(expanded === prompt.text ? null : prompt.text)
            }
          />
        ))}
      </TableBody>
    </Table>
  );
}

function PromptRow({
  prompt,
  selected,
  expanded,
  onToggle,
  onExpand,
}: {
  prompt: AiResearchedPrompt;
  selected: boolean;
  expanded: boolean;
  onToggle: () => void;
  onExpand: () => void;
}) {
  return (
    <>
      <TableRow data-state={selected ? "selected" : undefined}>
        <TableCell>
          <Checkbox
            checked={selected || prompt.tracked}
            disabled={prompt.tracked}
            onCheckedChange={onToggle}
            aria-label={`Select ${prompt.text}`}
          />
        </TableCell>
        <TableCell className="whitespace-normal">
          <span>{prompt.text}</span>
          {prompt.tracked && (
            <Badge variant="secondary" className="ml-2">
              Tracked
            </Badge>
          )}
          {prompt.variants.length > 0 && (
            <p
              className="text-xs text-muted-foreground"
              title={prompt.variants.join("\n")}
            >
              +{prompt.variants.length} similar{" "}
              {prompt.variants.length === 1 ? "prompt" : "prompts"} merged
            </p>
          )}
        </TableCell>
        <TableCell className="whitespace-normal">
          <span className="text-sm">
            {prompt.sources.length
              ? `${prompt.sources.length} ${prompt.sources.length === 1 ? "source" : "sources"}`
              : "No sources"}
          </span>
          {prompt.ownDomainCited && (
            <Badge variant="success" size="sm" className="ml-2">
              You
            </Badge>
          )}
        </TableCell>
        <TableCell>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-expanded={expanded}
            aria-label={`Show sources for ${prompt.text}`}
            onClick={onExpand}
          >
            {expanded ? <ChevronDown /> : <ChevronRight />}
          </Button>
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={4} className="whitespace-normal">
            <PromptSources prompt={prompt} />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function PromptSources({ prompt }: { prompt: AiResearchedPrompt }) {
  return (
    <div className="space-y-2 py-1 pl-10">
      <Badge variant={prompt.brandMentioned ? "success" : "outline"}>
        {prompt.brandMentioned
          ? "Your brand is mentioned"
          : "Your brand is not mentioned"}
      </Badge>
      {prompt.sources.length ? (
        <ul className="space-y-1.5">
          {prompt.sources.map((source) => (
            <li key={source.url} className="flex items-center gap-2 text-sm">
              <DomainFavicon domain={source.domain} />
              <span className="w-40 shrink-0 truncate text-muted-foreground">
                {source.domain}
              </span>
              <SafeExternalLink
                url={source.url}
                label={source.title ?? source.url}
                className="inline-flex min-w-0 items-center gap-1 hover:underline"
              />
              {source.own && (
                <Badge variant="success" size="sm">
                  You
                </Badge>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          The AI answered from memory and cited no sources.
        </p>
      )}
    </div>
  );
}
