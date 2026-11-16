import { formatToday } from "@/lib/date";
import { ThemeToggle } from "../ThemeToggle";

export function TodayHeader({ now }: { now: Date }) {
  const { weekday, hijri, gregorian } = formatToday(now);
  return (
    <header className="flex items-start justify-between gap-4 pt-2 pb-5">
      <div>
        <p className="text-sm font-semibold tracking-wide text-accent">عَزم</p>
        <h1 className="mt-1 text-3xl font-bold">{weekday}</h1>
        <p className="mt-1 text-base text-muted">
          {hijri} · {gregorian}
        </p>
      </div>
      <ThemeToggle />
    </header>
  );
}
