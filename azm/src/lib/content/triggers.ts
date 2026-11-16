import type { TriggerKind } from "../types";

export interface TriggerPreset {
  label: string;
  kind: TriggerKind;
  defaultTime: string; // تقريبي للرياض — تعدّله أنت
}

// أوقات الصلاة إشارات يومية ثابتة، فهي أقوى محفّز لخطط «إذا–فإن».
export const TRIGGER_PRESETS: TriggerPreset[] = [
  { label: "بعد الفجر", kind: "prayer", defaultTime: "05:15" },
  { label: "بعد الظهر", kind: "prayer", defaultTime: "12:15" },
  { label: "بعد العصر", kind: "prayer", defaultTime: "15:30" },
  { label: "بعد المغرب", kind: "prayer", defaultTime: "18:00" },
  { label: "بعد العشاء", kind: "prayer", defaultTime: "19:30" },
  { label: "لما أصحى", kind: "event", defaultTime: "07:00" },
  { label: "لما أرجع البيت", kind: "event", defaultTime: "16:30" },
];
