import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight, Search, Telescope } from "lucide-react";
import { EmptyState } from "@/client/components/EmptyState";
import { PageHeader } from "@/client/components/PageHeader";
import {
  SkeletonPageContent,
  SkeletonTableRows,
} from "@/client/components/SkeletonPresets";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui/table";
import { listAiResearchKeywords } from "@/serverFunctions/ai-visibility";
import { PromptResearchKeyword } from "./PromptResearchKeyword";
import {
  AiQueryError,
  aiVisibilityKey,
  useAiVisibilityTracker,
} from "./shared";

export function PromptResearchPage({
  projectId,
  keyword,
}: {
  projectId: string;
  keyword: string | undefined;
}) {
  const trackerQuery = useAiVisibilityTracker(projectId);
  const state = trackerQuery.data;
  if (trackerQuery.isPending) return <SkeletonPageContent />;
  if (trackerQuery.isError)
    return (
      <AiQueryError
        error={trackerQuery.error}
        retry={() => {
          void trackerQuery.refetch();
        }}
      />
    );
  if (!state?.configured)
    return (
      <div className="space-y-5 pt-1">
        <PageHeader title="Prompt Research" />
        <EmptyState
          icon={Telescope}
          title="Prompt research starts with a tracker"
          description="Set up prompt tracking to research prompts for your topics."
          action={
            <Button
              size="sm"
              nativeButton={false}
              render={
                <Link to="/p/$projectId/ai-visibility" params={{ projectId }} />
              }
            >
              Set up prompt tracking
            </Button>
          }
        />
      </div>
    );
  return keyword ? (
    <PromptResearchKeyword
      key={keyword}
      projectId={projectId}
      state={state}
      keyword={keyword}
    />
  ) : (
    <KeywordList projectId={projectId} />
  );
}

function KeywordList({ projectId }: { projectId: string }) {
  const navigate = useNavigate();
  const query = useQuery({
    queryKey: [...aiVisibilityKey(projectId), "researchKeywords"],
    queryFn: () => listAiResearchKeywords({ data: { projectId } }),
  });
  return (
    <div className="space-y-5 pt-1">
      <div className="flex flex-col items-center gap-4 rounded-lg border bg-card px-4 py-10 text-center border-border">
        <h1 className="text-2xl font-semibold tracking-tight">
          Explore questions about your market
        </h1>
        <KeywordSearch projectId={projectId} />
      </div>
      <div className="overflow-hidden rounded-lg border bg-card border-border">
        <div className="border-b p-4 border-border">
          <h2 className="font-medium">Relevant keywords</h2>
          <p className="text-sm text-muted-foreground">
            Select a keyword to see the prompts people ask AI about it.
          </p>
        </div>
        {query.isPending ? (
          <SkeletonTableRows rows={5} columns={1} className="p-4" />
        ) : query.isError ? (
          <AiQueryError
            error={query.error}
            retry={() => {
              void query.refetch();
            }}
          />
        ) : !query.data.keywords.length ? (
          <p className="p-10 text-center text-sm text-muted-foreground">
            Add topics to your tracker, or search a keyword above.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Keyword</TableHead>
                <TableHead className="w-10">
                  <span className="sr-only">Open</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data.keywords.map((keyword) => (
                // Any cell opens the keyword; the link keeps it keyboard reachable.
                <TableRow
                  key={keyword}
                  className="cursor-pointer"
                  onClick={() =>
                    void navigate({
                      to: "/p/$projectId/ai-visibility/research",
                      params: { projectId },
                      search: { q: keyword },
                    })
                  }
                >
                  <TableCell>
                    <Link
                      to="/p/$projectId/ai-visibility/research"
                      params={{ projectId }}
                      search={{ q: keyword }}
                      className="font-medium hover:underline"
                      // The row navigates too; this keeps new-tab clicks to one tab.
                      onClick={(event) => event.stopPropagation()}
                    >
                      {keyword}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

function KeywordSearch({ projectId }: { projectId: string }) {
  const navigate = useNavigate();
  const [draft, setDraft] = useState("");
  return (
    <form
      className="w-full max-w-xl text-left"
      onSubmit={(event) => {
        event.preventDefault();
        if (!draft.trim()) return;
        void navigate({
          to: "/p/$projectId/ai-visibility/research",
          params: { projectId },
          search: { q: draft.trim() },
        });
      }}
    >
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Enter a keyword"
          aria-label="Keyword"
          aria-describedby="ai-keyword-research-cost"
          maxLength={100}
        />
        <Button type="submit" disabled={!draft.trim()}>
          <Search /> Analyze
        </Button>
      </div>
      <p
        id="ai-keyword-research-cost"
        className="mt-2 text-xs text-muted-foreground"
      >
        About $0.25 in credits per keyword.
      </p>
    </form>
  );
}
