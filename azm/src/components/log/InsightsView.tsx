"use client";

import Link from "next/link";
import { ADVICE } from "@/lib/content/advice";
import { feelingById } from "@/lib/content/feelings";
import { getProcrastinationLog, getSettings, getStuckLog } from "@/lib/db";
import { toDateKey } from "@/lib/date";
import { useStored } from "@/lib/hooks/useStored";
import { DAY_PARTS, analyze } from "@/lib/stats";
import { Card } from "../ui/Card";
import { PageHeader } from "../ui/PageHeader";

async function load() {
  const today = toDateKey();
  const [settings, log, stuck] = await Promise.all([getSettings(), getProcrastinationLog(), getStuckLog()]);
  return { today, tracks: settings.tracks, insights: analyze(log, today), stuck };
}

const MIN_ENTRIES = 3;
const weekdayFmt = new Intl.DateTimeFormat("ar-SA-u-ca-gregory", { weekday: "short" });

export function InsightsView() {
  const data = useStored(load);
  if (!data) return null;
  const { tracks, insights, stuck } = data;
  const { total, topFeeling, topTrack, topPart, week } = insights;
  const pct = (n: number) => `${Math.round((n / total) * 100)}%`;
  const maxDay = Math.max(1, ...week.map((d) => d.count));
  const started = stuck.filter((s) => s.outcome !== "not_started").length;

  return (
    <div className="space-y-4">
      <PageHeader
        title="التحليل"
        subtitle="وش يقول سجلك عنك؟"
        action={
          <Link href="/log" className="flex min-h-11 items-center rounded-full border border-line bg-surface px-4 text-sm font-semibold text-muted">
            السجل
          </Link>
        }
      />

      {total < MIN_ENTRIES && (
        <Card>
          <p className="text-lg leading-relaxed">
            سجّل {MIN_ENTRIES} مرات على الأقل عشان يبان النمط. عندك الحين {total}.
          </p>
        </Card>
      )}

      {total > 0 && (
        <div className="grid grid-cols-1 gap-3">
          {topFeeling && (
            <Fact
              label="أكثر شعور يتكرر"
              value={`${feelingById(topFeeling[0]).emoji} ${feelingById(topFeeling[0]).label}`}
              meta={`${topFeeling[1]} مرة · ${pct(topFeeling[1])}`}
            />
          )}
          {topTrack && (
            <Fact
              label="أكثر مسار تأجّله"
              value={tracks.find((t) => t.id === topTrack[0])?.name ?? "مسار محذوف"}
              meta={`${topTrack[1]} مرة`}
            />
          )}
          {topPart && <Fact label="أكثر وقت تسوّف فيه" value={DAY_PARTS[topPart[0]]} meta={`${topPart[1]} مرة`} />}
        </div>
      )}

      <Card title="آخر 7 أيام">
        <div className="flex h-40 items-end gap-2" role="img" aria-label={`عدد مرات التسويف: ${week.map((d) => d.count).join("، ")}`}>
          {week.map((d) => (
            <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-xs tabular-nums text-muted">{d.count || ""}</span>
              <div
                className={`w-full max-w-10 rounded-t-lg ${d.count ? "bg-accent" : "bg-line"}`}
                style={{ height: `${d.count ? Math.max(8, (d.count / maxDay) * 100) : 4}px` }}
              />
              <span className="text-xs text-muted">{weekdayFmt.format(new Date(`${d.date}T12:00:00`))}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm text-muted">الرقم الأعلى مو فشل. يعني إنك صرت تلاحظ أكثر.</p>
      </Card>

      {topFeeling && total >= MIN_ENTRIES && (
        <Card title="الأداة المناسبة لك الحين" className="border-calm/40">
          <h3 className="text-xl font-bold text-calm">{ADVICE[topFeeling[0]].tool}</h3>
          <p className="mt-2 text-lg leading-relaxed">{ADVICE[topFeeling[0]].body}</p>
          <p className="mt-3 rounded-2xl bg-surface-2 p-4 text-base">
            <span className="font-bold">جرّب اليوم: </span>
            {ADVICE[topFeeling[0]].tryNow}
          </p>
        </Card>
      )}

      {stuck.length > 0 && (
        <Card title="زر الطوارئ">
          <p className="text-lg">
            استخدمته <b className="tabular-nums">{stuck.length}</b> مرة، وبدأت فعلًا في <b className="tabular-nums">{started}</b> منها.
          </p>
          <p className="mt-1 text-sm text-muted">وكل مرة ما بدأت فيها، طلعت منها بخطة.</p>
        </Card>
      )}
    </div>
  );
}

function Fact({ label, value, meta }: { label: string; value: string; meta: string }) {
  return (
    <div className="rounded-3xl border border-line bg-surface p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
      <p className="mt-1 text-sm tabular-nums text-muted">{meta}</p>
    </div>
  );
}
