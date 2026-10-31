"use client";

import { useSyncExternalStore } from "react";
import { buildEventGroups, encodeEvents, selectedEvents, type EventGroup } from "@/lib/calendar";
import { getCalendarPrefs, getPlans, getSettings, updateCalendarPrefs, updatePlan, updateSettings } from "@/lib/db";
import { useStored } from "@/lib/hooks/useStored";
import { buildIcs, googleCalendarUrl, type CalEvent } from "@/lib/ics";
import { newId } from "@/lib/id";
import type { CalendarPrefs } from "@/lib/types";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Select, TextInput } from "../ui/fields";
import { IconPlus, IconX } from "../ui/icons";

async function load() {
  const [settings, prefs, plans] = await Promise.all([getSettings(), getCalendarPrefs(), getPlans()]);
  return { settings, prefs, plans };
}

const useOrigin = () =>
  useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => "",
  );

const GROUP_LABELS: Record<EventGroup["key"], string> = {
  frog: "ساعة الضفدع (يومي)",
  planning: "دقيقتين تخطيط لبكرة (يومي)",
  review: "المحاسبة الأسبوعية (كل خميس)",
  plans: "خطط إذا–فإن اللي لها وقت",
  windows: "نوافذ العمل (بداية ونهاية)",
};

export function CalendarSettings() {
  const data = useStored(load);
  const origin = useOrigin();
  if (!data || !origin) return null;
  const { settings, prefs, plans } = data;
  const groups = buildEventGroups(settings, prefs, plans, origin);
  const events = selectedEvents(groups, prefs);
  const live = events.filter((e) => !e.cancelled).length;

  const download = () => {
    const blob = new Blob([buildIcs(events)], { type: "text/calendar;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "azm.ics";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  };

  const toggle = (key: EventGroup["key"]) => updateCalendarPrefs({ [key]: !prefs[key] } as Partial<CalendarPrefs>);

  return (
    <Card title="التذكيرات عبر التقويم" className="border-accent/30">
      <p className="mb-4 text-base leading-relaxed text-muted">
        بدون سيرفر ولا رسائل: تقويم جوالك يذكّرك قبل كل حدث بـ5 دقائق، والضغط على التذكير يفتح عَزم على صفحة «اليوم».
      </p>

      <div className="space-y-4">
        {groups.map((g) => (
          <section key={g.key} className="rounded-2xl bg-surface-2 p-4">
            <label className="flex min-h-11 cursor-pointer items-center gap-3 text-lg font-semibold">
              <input type="checkbox" className="size-5 accent-[var(--accent)]" checked={prefs[g.key]} onChange={() => toggle(g.key)} />
              {GROUP_LABELS[g.key]}
            </label>

            {g.key === "frog" && (
              <TimeRow value={settings.frogTime} onChange={(v) => updateSettings({ frogTime: v })} event={g.events[0]} label="وقت ساعة الضفدع" />
            )}
            {g.key === "planning" && (
              <TimeRow value={prefs.planningTime} onChange={(v) => updateCalendarPrefs({ planningTime: v })} event={g.events[0]} label="وقت التخطيط" />
            )}
            {g.key === "review" && (
              <TimeRow value={prefs.reviewTime} onChange={(v) => updateCalendarPrefs({ reviewTime: v })} event={g.events[0]} label="وقت المحاسبة" />
            )}

            {g.key === "plans" && (
              <ul className="mt-2 space-y-3">
                {plans.length === 0 && <li className="text-sm text-muted">ما عندك خطط للحين.</li>}
                {plans.map((p) => {
                  const ev = g.events.find((e) => e.uid === `azm-plan-${p.id}@azm.app`);
                  return (
                    <li key={p.id} className={p.active ? "" : "opacity-60"}>
                      <p className="text-base">
                        إذا {p.trigger} ← {p.action} {!p.active && <span className="text-xs text-muted">(موقوفة — تنلغى من التقويم)</span>}
                      </p>
                      <TimeRow value={p.time ?? ""} onChange={(v) => updatePlan(p.id, { time: v || null })} event={ev && !ev.cancelled ? ev : undefined} label={`وقت الخطة ${p.trigger}`} />
                    </li>
                  );
                })}
              </ul>
            )}

            {g.key === "windows" && <WindowSlots prefs={prefs} tracks={settings.tracks} events={g.events} />}
          </section>
        ))}
      </div>

      <div className="mt-5 space-y-3">
        {/* رابط عادي (مو تنقّل داخلي): الآيفون يفتح ملف text/calendar مباشرة في التقويم */}
        <a
          href={`/calendar.ics?d=${encodeEvents(events)}`}
          className={`flex min-h-14 w-full items-center justify-center rounded-2xl bg-accent text-lg font-semibold text-accent-fg ${events.length ? "" : "pointer-events-none opacity-40"}`}
        >
          أضف لتقويم الآيفون ({live})
        </a>
        <Button block variant="secondary" onClick={download} disabled={!events.length}>
          حمّل ملف ‎.ics
        </Button>
      </div>

      <Instructions />
    </Card>
  );
}

function TimeRow({ value, onChange, event, label }: { value: string; onChange: (v: string) => void; event?: CalEvent; label: string }) {
  return (
    <div className="mt-2 flex items-center gap-2">
      <TextInput type="time" dir="ltr" className="min-h-12 max-w-40 text-center" value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} />
      {event && (
        <a
          href={googleCalendarUrl(event)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="أضف لـ Google Calendar"
          className="flex min-h-12 shrink-0 items-center whitespace-nowrap rounded-2xl border border-line px-4 text-sm font-semibold text-accent"
        >
          + Google
        </a>
      )}
    </div>
  );
}

function WindowSlots({ prefs, tracks, events }: { prefs: CalendarPrefs; tracks: { id: string; name: string }[]; events: CalEvent[] }) {
  const slots = prefs.windowSlots;
  const update = (id: string, patch: Partial<(typeof slots)[number]>) =>
    updateCalendarPrefs({ windowSlots: slots.map((s) => (s.id === id ? { ...s, ...patch } : s)) });

  return (
    <div className="mt-2 space-y-3">
      {slots.map((s) => (
        <div key={s.id} className="rounded-2xl border border-line p-3">
          <div className="flex items-center gap-2">
            <Select value={s.trackId ?? ""} onChange={(e) => update(s.id, { trackId: e.target.value || null })} aria-label="مسار النافذة" className="min-h-12 text-base">
              <option value="">بدون مسار</option>
              {tracks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
            <button
              type="button"
              aria-label="احذف النافذة"
              onClick={() => updateCalendarPrefs({ windowSlots: slots.filter((x) => x.id !== s.id) })}
              className="grid size-11 shrink-0 place-items-center text-muted"
            >
              <IconX className="size-5" />
            </button>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <Select value={s.minutes} onChange={(e) => update(s.id, { minutes: Number(e.target.value) })} aria-label="طول النافذة" className="min-h-12 max-w-32 text-base">
              {[45, 60, 75, 90, 105, 120].map((m) => (
                <option key={m} value={m}>
                  {m} د
                </option>
              ))}
            </Select>
          </div>
          <TimeRow value={s.start} onChange={(v) => update(s.id, { start: v })} event={events.find((e) => e.uid === `azm-window-${s.id}@azm.app`)} label="بداية النافذة" />
        </div>
      ))}
      <Button
        variant="secondary"
        className="min-h-12 text-base"
        onClick={() => updateCalendarPrefs({ windowSlots: [...slots, { id: newId(), trackId: tracks[0]?.id ?? null, start: "16:00", minutes: 60 }] })}
      >
        <IconPlus /> أضف نافذة
      </Button>
    </div>
  );
}

function Instructions() {
  return (
    <div className="mt-5 space-y-2">
      <details className="rounded-2xl bg-surface-2 p-4">
        <summary className="cursor-pointer text-base font-semibold">كيف أضيفها على الآيفون؟</summary>
        <ol className="mt-3 list-decimal space-y-2 ps-5 text-base leading-relaxed">
          <li>افتح عَزم من Safari، واضغط «أضف لتقويم الآيفون».</li>
          <li>تطلع لك قائمة الأحداث: اضغط «إضافة الكل» (Add All) واختر التقويم.</li>
          <li>لو حمّلت الملف بدالها: افتح تطبيق «الملفات» ← التنزيلات ← اضغط على azm.ics ← «إضافة الكل».</li>
          <li>تأكد إن التنبيهات مفعّلة: الإعدادات ← التقويم ← التنبيهات.</li>
        </ol>
      </details>
      <details className="rounded-2xl bg-surface-2 p-4">
        <summary className="cursor-pointer text-base font-semibold">كيف أضيفها على Google Calendar؟</summary>
        <ol className="mt-3 list-decimal space-y-2 ps-5 text-base leading-relaxed">
          <li>
            <b>حدث وحدة:</b> اضغط «أضف لـ Google Calendar» جنب الحدث، ثم «حفظ». (التنبيه هنا يكون حسب إعدادات Google الافتراضية.)
          </li>
          <li>
            <b>كل الأحداث مرة وحدة:</b> حمّل ملف ‎.ics، ثم من الكمبيوتر افتح calendar.google.com ← ⚙️ الإعدادات ← «استيراد وتصدير» ← اختر الملف ← «استيراد».
          </li>
          <li>الاستيراد في Google ما يشتغل من تطبيق الجوال، لازم من المتصفح.</li>
        </ol>
      </details>
      <p className="px-1 text-sm leading-relaxed text-muted">
        عدّلت وقت؟ صدّر الملف مرة ثانية: كل حدث له معرّف ثابت فيتحدّث بدل ما يتكرر. الخطة الموقوفة تنلغى. الخطة المحذوفة لازم تحذف حدثها يدويًا من التقويم.
      </p>
    </div>
  );
}
