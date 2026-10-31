"use client";

import { useState } from "react";
import { feelingById } from "@/lib/content/feelings";
import { toDateKey } from "@/lib/date";
import {
  addTasks,
  getHabits,
  getProcrastinationLog,
  getReviews,
  getSessions,
  getSettings,
  getStuckLog,
  getTasks,
  saveReview,
} from "@/lib/db";
import { useStored } from "@/lib/hooks/useStored";
import { weekSummary } from "@/lib/stats";
import type { Track, WeeklyReview } from "@/lib/types";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { TextArea, TextInput } from "../ui/fields";
import { PageHeader } from "../ui/PageHeader";

async function load() {
  const now = new Date();
  const today = toDateKey(now);
  const [settings, log, sessions, stuck, habits, reviews] = await Promise.all([
    getSettings(),
    getProcrastinationLog(),
    getSessions(),
    getStuckLog(),
    getHabits(),
    getReviews(),
  ]);
  return {
    today,
    isThursday: now.getDay() === 4,
    tracks: settings.tracks,
    summary: weekSummary(today, { log, sessions, stuck, habits }),
    reviews,
  };
}

const dateFmt = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", { weekday: "long", day: "numeric", month: "long" });

export function ReviewView() {
  const data = useStored(load);
  if (!data) return null;
  const { today, isThursday, tracks, summary, reviews } = data;
  const existing = reviews.find((r) => r.date === today);

  return (
    <div className="space-y-4">
      <PageHeader
        title="المحاسبة الأسبوعية"
        subtitle={isThursday ? "الليلة ليلة المحاسبة. ربع ساعة تكفي." : "مكانها الطبيعي مساء الخميس، بس تقدر تسويها أي وقت."}
      />

      <Card title="أرقام آخر 7 أيام">
        <div className="grid grid-cols-2 gap-2">
          <Stat value={summary.minutes} label="دقيقة تركيز" />
          <Stat value={summary.sessions} label="جلسة" />
          <Stat value={summary.procrastinations} label="تأجيل مسجّل" />
          <Stat value={summary.habitRate === null ? "—" : `${Math.round(summary.habitRate * 100)}%`} label="التزام العادات" />
          <Stat value={summary.stuckUses} label="استخدام للطوارئ" />
          <Stat value={summary.stuckUses ? `${summary.stuckStarted}/${summary.stuckUses}` : "—"} label="بدأت بعد الطوارئ" />
        </div>
        {summary.topFeeling && (
          <p className="mt-3 text-base text-muted">
            أكثر شعور هالأسبوع: {feelingById(summary.topFeeling).emoji} {feelingById(summary.topFeeling).label}
          </p>
        )}
      </Card>

      <ReviewForm key={today} today={today} tracks={tracks} existing={existing} />

      {reviews.filter((r) => r.date !== today).length > 0 && (
        <Card title="محاسبات سابقة">
          <ul className="space-y-2">
            {reviews
              .filter((r) => r.date !== today)
              .slice()
              .reverse()
              .map((r) => (
                <li key={r.id}>
                  <details className="rounded-2xl bg-surface-2 p-4">
                    <summary className="cursor-pointer text-lg font-semibold">{dateFmt.format(new Date(`${r.date}T12:00:00`))}</summary>
                    <dl className="mt-3 space-y-2 text-base">
                      <Past label="أنجزت" value={r.achieved} />
                      <Past label="أجّلت وليش" value={r.postponed} />
                      <Past label="الأداة اللي نفعت" value={r.helpful} />
                    </dl>
                  </details>
                </li>
              ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function ReviewForm({ today, tracks, existing }: { today: string; tracks: Track[]; existing?: WeeklyReview }) {
  const [achieved, setAchieved] = useState(existing?.achieved ?? "");
  const [postponed, setPostponed] = useState(existing?.postponed ?? "");
  const [helpful, setHelpful] = useState(existing?.helpful ?? "");
  const [next, setNext] = useState<Record<string, string[]>>(
    () => Object.fromEntries(tracks.map((t) => [t.id, existing?.nextTasks[t.id] ?? ["", "", ""]])),
  );
  const [saved, setSaved] = useState(false);

  const setTask = (trackId: string, i: number, v: string) =>
    setNext((prev) => ({ ...prev, [trackId]: prev[trackId].map((x, j) => (j === i ? v : x)) }));

  const submit = async () => {
    const nextTasks = Object.fromEntries(Object.entries(next).map(([k, v]) => [k, v.map((x) => x.trim()).filter(Boolean)]));
    await saveReview({ date: today, achieved, postponed, helpful, nextTasks });
    // مهام الأسبوع الجاي تنضاف لقائمة المهام (بدون تكرار).
    const existingTexts = new Set((await getTasks()).map((t) => t.text));
    const toAdd = Object.entries(nextTasks).flatMap(([trackId, items]) =>
      items.filter((text) => !existingTexts.has(text)).map((text) => ({ text, trackId, source: "review" as const })),
    );
    if (toAdd.length) await addTasks(toAdd);
    setSaved(true);
  };

  return (
    <Card title="أسئلة المحاسبة" className="border-accent/30">
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Question label="وش أنجزت هالأسبوع؟" value={achieved} onChange={setAchieved} placeholder="حتى الصغير ينحسب" />
        <Question label="وش أجّلت؟ وليش؟" value={postponed} onChange={setPostponed} placeholder="بدون لوم: وش الشعور اللي كان وراه؟" />
        <Question label="وش الأداة اللي نفعت؟" value={helpful} onChange={setHelpful} placeholder="الطوارئ؟ النافذة؟ خطة إذا–فإن؟" />

        <fieldset>
          <legend className="mb-3 text-lg font-bold">أهم 3 مهام لكل مسار الأسبوع الجاي</legend>
          <div className="space-y-4">
            {tracks.map((t) => (
              <div key={t.id}>
                <p className="mb-2 text-sm font-semibold text-accent">{t.name}</p>
                <div className="space-y-2">
                  {(next[t.id] ?? ["", "", ""]).map((v, i) => (
                    <TextInput key={i} value={v} onChange={(e) => setTask(t.id, i, e.target.value)} placeholder={`مهمة ${i + 1}`} aria-label={`${t.name} مهمة ${i + 1}`} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </fieldset>

        <Button type="submit" block>
          {existing ? "حدّث المحاسبة" : "احفظ المحاسبة"}
        </Button>
        {saved && <p role="status" className="text-center text-base text-ok">انحفظت، والمهام انضافت لقائمة مهامك. أسبوع جديد، بداية جديدة.</p>}
      </form>
    </Card>
  );
}

function Question({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-lg font-bold">{label}</span>
      <TextArea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </label>
  );
}

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="rounded-2xl bg-surface-2 p-3 text-center">
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}

function Past({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="whitespace-pre-line">{value}</dd>
    </div>
  );
}
