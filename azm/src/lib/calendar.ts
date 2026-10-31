// يحوّل إعداداتك وخططك لأحداث تقويم.
import type { CalEvent } from "./ics";
import type { CalendarPrefs, IfThenPlan, Settings } from "./types";

export interface EventGroup {
  key: "frog" | "planning" | "review" | "plans" | "windows";
  events: CalEvent[];
}

export function buildEventGroups(settings: Settings, prefs: CalendarPrefs, plans: IfThenPlan[], origin: string): EventGroup[] {
  const url = `${origin}/?from=calendar`;
  const open = `افتح عَزم: ${url}`;
  const trackName = (id: string | null) => settings.tracks.find((t) => t.id === id)?.name;

  return [
    {
      key: "frog",
      events: [
        {
          uid: "azm-frog@azm.app",
          title: "🐸 ساعة الضفدع",
          description: `أصعب مهمة أولًا. المهمة الوحدة لليوم.\n${open}`,
          start: settings.frogTime,
          minutes: 60,
          rrule: "FREQ=DAILY",
          url,
        },
      ],
    },
    {
      key: "planning",
      events: [
        {
          uid: "azm-planning@azm.app",
          title: "📝 دقيقتين تخطيط لبكرة",
          description: `اكتب مهمة الضفدع لبكرة وأول خطوة فيها.\n${open}`,
          start: prefs.planningTime,
          minutes: 10,
          rrule: "FREQ=DAILY",
          url,
        },
      ],
    },
    {
      key: "review",
      events: [
        {
          uid: "azm-weekly-review@azm.app",
          title: "📊 المحاسبة الأسبوعية",
          description: `وش أنجزت؟ وش أجلت وليش؟ وش الأداة اللي نفعت؟\n${origin}/review`,
          start: prefs.reviewTime,
          minutes: 30,
          rrule: "FREQ=WEEKLY;BYDAY=TH",
          url: `${origin}/review`,
        },
      ],
    },
    {
      key: "plans",
      events: plans
        .filter((p) => p.time)
        .map((p) => ({
          uid: `azm-plan-${p.id}@azm.app`,
          title: `إذا ${p.trigger} ← ${p.action}`,
          description: `${trackName(p.trackId) ? `المسار: ${trackName(p.trackId)}\n` : ""}${open}`,
          start: p.time!,
          minutes: 15,
          rrule: "FREQ=DAILY",
          url,
          cancelled: !p.active,
        })),
    },
    {
      key: "windows",
      events: prefs.windowSlots.map((w) => ({
        uid: `azm-window-${w.id}@azm.app`,
        title: `🪟 نافذة عمل${trackName(w.trackId) ? `: ${trackName(w.trackId)}` : ""} (${w.minutes} د)`,
        description: `لما تنتهي النافذة توقف، حتى لو متحمس.\n${origin}/timer`,
        start: w.start,
        minutes: w.minutes,
        rrule: "FREQ=DAILY",
        url: `${origin}/timer`,
        alarmAtEnd: true,
      })),
    },
  ];
}

export function selectedEvents(groups: EventGroup[], prefs: CalendarPrefs): CalEvent[] {
  return groups.filter((g) => prefs[g.key]).flatMap((g) => g.events);
}

// ترميز الأحداث في الرابط لمسار /calendar.ics (يفتح التقويم مباشرة في الآيفون).
export function encodeEvents(events: CalEvent[]): string {
  const bytes = new TextEncoder().encode(JSON.stringify(events));
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeEvents(token: string): CalEvent[] {
  const b64 = token.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "===".slice((b64.length + 3) % 4));
  const json = new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
  const parsed = JSON.parse(json) as CalEvent[];
  if (!Array.isArray(parsed)) throw new Error("bad payload");
  // تنظيف بسيط: نقبل الحقول المعروفة بس.
  return parsed.slice(0, 100).map((e) => ({
    uid: String(e.uid).replace(/[^\w@.-]/g, "").slice(0, 120),
    title: String(e.title).slice(0, 300),
    description: String(e.description).slice(0, 1000),
    start: /^\d{2}:\d{2}$/.test(e.start) ? e.start : "09:00",
    minutes: Math.min(600, Math.max(5, Number(e.minutes) || 15)),
    rrule: /^FREQ=(DAILY|WEEKLY)(;BYDAY=[A-Z]{2})?$/.test(e.rrule) ? e.rrule : "FREQ=DAILY",
    url: e.url && /^https?:\/\//.test(e.url) ? String(e.url).slice(0, 300) : undefined,
    alarmAtEnd: !!e.alarmAtEnd,
    cancelled: !!e.cancelled,
  }));
}
