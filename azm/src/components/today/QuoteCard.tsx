import { QUOTES } from "@/lib/content/quotes";
import { dayOfYear } from "@/lib/date";
import type { DateKey } from "@/lib/types";

export function QuoteCard({ date }: { date: DateKey }) {
  const q = QUOTES[dayOfYear(date) % QUOTES.length];
  return (
    <figure className="px-2 py-4 text-center">
      <blockquote className="text-xl leading-loose font-medium">«{q.text}»</blockquote>
      <figcaption className="mt-2 text-sm text-muted">— {q.author}</figcaption>
    </figure>
  );
}
