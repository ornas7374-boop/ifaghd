"use client";

import { useEffect, useState } from "react";
import { addPlan, addStuckEntry, getDay, getSettings } from "@/lib/db";
import { toDateKey } from "@/lib/date";
import type { FeelingId, StuckOutcome, Track } from "@/lib/types";
import type { PlanDraft } from "../plans/IfThenForm";
import { BreathingStep } from "./BreathingStep";
import { ClearStep } from "./ClearStep";
import { FeelingStep } from "./FeelingStep";
import { AskContinue, Ending, FailStep } from "./OutcomeSteps";
import { TimerStep } from "./TimerStep";
import { TinyStep } from "./TinyStep";

type Step = "feeling" | "breathe" | "tiny" | "clear" | "timer" | "ask" | "fail" | "end";

export function StuckFlow() {
  const [step, setStep] = useState<Step>("feeling");
  const [task, setTask] = useState("");
  const [feeling, setFeeling] = useState<FeelingId | null>(null);
  const [note, setNote] = useState("");
  const [tinyStep, setTinyStep] = useState("");
  const [outcome, setOutcome] = useState<StuckOutcome>("stopped");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [frogTrack, setFrogTrack] = useState<string | null>(null);

  // نعبّي المهمة من «المهمة الوحدة» لليوم إذا موجودة.
  useEffect(() => {
    getDay(toDateKey()).then((d) => {
      if (d.frog && !d.frog.done) {
        setTask((t) => t || d.frog!.text);
        setFrogTrack(d.frog.trackId);
      }
    });
    getSettings().then((s) => setTracks(s.tracks));
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [step]);

  const log = (result: StuckOutcome, planId?: string) =>
    addStuckEntry({
      feeling: feeling ?? "other",
      feelingNote: note.trim() || undefined,
      task: task.trim(),
      tinyStep: tinyStep.trim(),
      outcome: result,
      planId,
    });

  const finish = async (result: StuckOutcome, planId?: string) => {
    await log(result, planId);
    setOutcome(result);
    setStep("end");
  };

  const savePlan = async (draft: PlanDraft) => {
    const plan = await addPlan(draft);
    await finish("not_started", plan.id);
  };

  switch (step) {
    case "feeling":
      return (
        <FeelingStep
          task={task}
          onTask={setTask}
          feeling={feeling}
          onFeeling={setFeeling}
          note={note}
          onNote={setNote}
          onNext={() => setStep("breathe")}
        />
      );
    case "breathe":
      return <BreathingStep onNext={() => setStep("tiny")} />;
    case "tiny":
      return <TinyStep value={tinyStep} onChange={setTinyStep} onNext={() => setStep("clear")} />;
    case "clear":
      return <ClearStep onNext={() => setStep("timer")} />;
    case "timer":
      return <TimerStep tinyStep={tinyStep} onDone={() => setStep("ask")} onGiveUp={() => setStep("fail")} />;
    case "ask":
      return <AskContinue onContinue={() => finish("continued")} onStop={() => finish("stopped")} />;
    case "fail":
      return <FailStep tracks={tracks} trackId={frogTrack} tinyStep={tinyStep} onSave={savePlan} />;
    case "end":
      return <Ending kind={outcome} />;
  }
}
