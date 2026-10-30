import type { FeelingId } from "../types";

export interface Feeling {
  id: FeelingId;
  label: string;
  emoji: string;
  /** جملة تطمين قصيرة بعد ما تسمّي الشعور. */
  hint: string;
}

export const FEELINGS: Feeling[] = [
  { id: "bored", label: "ملل", emoji: "🥱", hint: "الملل إشارة، مو حكم. بنخليها قصيرة جدًا." },
  { id: "anxious", label: "قلق", emoji: "😟", hint: "القلق يخف لما تتحرك، مو لما تنتظر." },
  { id: "fear", label: "خوف إنه يطلع سيء", emoji: "😬", hint: "المطلوب مسودة، مو تحفة. مُرسَل أحسن من ممتاز." },
  { id: "exhausted", label: "إرهاق", emoji: "😮‍💨", hint: "تعبان؟ عادي. بنسوي أخف نسخة ممكنة من المهمة." },
  { id: "lost", label: "ما أدري من وين أبدأ", emoji: "🧭", hint: "ما تحتاج تعرف الطريق كله. تحتاج أول خطوة بس." },
  { id: "other", label: "شي ثاني", emoji: "✍️", hint: "إنك سمّيته، هذا نص الشغل." },
];

export const feelingById = (id: FeelingId) => FEELINGS.find((f) => f.id === id)!;
