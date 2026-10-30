"use client";

import Link from "next/link";
import type { Track } from "@/lib/types";
import { IfThenForm, type PlanDraft } from "../plans/IfThenForm";
import { Button } from "../ui/Button";
import { StepFrame } from "./StepFrame";

export function AskContinue({ onContinue, onStop }: { onContinue: () => void; onStop: () => void }) {
  return (
    <StepFrame
      title="خلصت العشر دقائق"
      subtitle="أنت حر الحين. تكمل؟"
      footer={
        <>
          <Button block onClick={onContinue}>
            أكمل
          </Button>
          <Button block variant="secondary" onClick={onStop}>
            بوقف هنا
          </Button>
        </>
      }
    >
      <div className="grid place-items-center py-10 text-7xl" aria-hidden>
        🔥
      </div>
    </StepFrame>
  );
}

export function FailStep({
  tracks,
  trackId,
  tinyStep,
  onSave,
}: {
  tracks: Track[];
  trackId: string | null;
  tinyStep: string;
  onSave: (plan: PlanDraft) => void;
}) {
  return (
    <StepFrame title="تعثرت، وهذا بشري" subtitle="ما في داعي تلوم نفسك. اللوم يزيد التسويف، والتسامح يقلّله. خلنا نجهّز أقرب فرصة.">
      <div className="rounded-3xl border border-line bg-surface p-5">
        <IfThenForm tracks={tracks} initialAction={tinyStep} initialTrackId={trackId} submitLabel="احفظ خطتي للفرصة الجاية" onSubmit={onSave} />
      </div>
    </StepFrame>
  );
}

const ENDINGS = {
  continued: { emoji: "💪", title: "كفو، كمّل", body: "الجمود انكسر وأنت ماشي. اشتغل على راحتك، والطوارئ موجودة لو علقت مرة ثانية." },
  stopped: { emoji: "✅", title: "وقفت، وكسرت الجمود. وهذا إنجاز", body: "بدأت شي كنت تهرب منه. المرة الجاية بتكون أسهل." },
  not_started: { emoji: "🌱", title: "خطتك جاهزة", body: "سجلناها لك. لا تفوّت مرتين: الفرصة الجاية هي اللي تفرق." },
} as const;

export function Ending({ kind }: { kind: keyof typeof ENDINGS }) {
  const e = ENDINGS[kind];
  return (
    <StepFrame
      title={e.title}
      footer={
        <Link
          href="/"
          className="flex min-h-14 w-full items-center justify-center rounded-2xl bg-accent text-lg font-semibold text-accent-fg"
        >
          رجوع لليوم
        </Link>
      }
    >
      <div className="grid place-items-center py-8 text-7xl" aria-hidden>
        {e.emoji}
      </div>
      <p className="text-center text-xl leading-relaxed text-muted">{e.body}</p>
    </StepFrame>
  );
}
