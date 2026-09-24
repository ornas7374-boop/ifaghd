import { Hammer } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/ui/states";

/** Placeholder for pages scheduled after the Overview sign-off. */
export function ComingNext({ title, description, bullets }: { title: string; description: string; bullets: string[] }) {
  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-6 md:px-6 md:py-8">
      <h1 className="text-[22px] font-semibold tracking-[-0.01em]">{title}</h1>
      <p className="mt-1 text-[13px] text-muted">{description}</p>
      <div className="mt-6 rounded-[10px] border border-dashed border-border-strong">
        <EmptyState
          icon={Hammer}
          title={`${title} is next in the build queue`}
          body="The shell, command palette and record panels already work here — try ⌘K and search for an order."
          action={
            <Link href="/" className="inline-flex h-7 items-center rounded-[6px] bg-accent-solid px-2.5 text-[12px] font-medium text-on-accent hover:bg-accent-hover">
              Back to Overview
            </Link>
          }
        />
        <ul className="mx-auto mb-10 flex max-w-md flex-col gap-1.5 px-6 text-[12.5px] text-muted">
          {bullets.map((b) => (
            <li key={b} className="flex gap-2">
              <span className="mt-[7px] size-1 shrink-0 rounded-full bg-dim" />
              {b}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
