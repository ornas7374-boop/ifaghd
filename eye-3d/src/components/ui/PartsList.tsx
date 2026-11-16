"use client";

import { EYE_PARTS, LAYER_GROUPS, VIEW_PRESETS, type LayerGroup, type PartId } from "@/data/eyeParts";
import { EyeIcon, EyeOffIcon, LayersIcon } from "./icons";

interface Props {
  hiddenParts: Set<PartId>;
  hoveredPart: PartId | null;
  showEnglish: boolean;
  onSelect: (id: PartId) => void;
  onHover: (id: PartId | null) => void;
  onToggleVisibility: (id: PartId) => void;
  onApplyPreset: (hidden: PartId[]) => void;
  activePreset: string | null;
}

const GROUP_ORDER: LayerGroup[] = ["outer", "middle", "inner", "refractive"];

export default function PartsList({
  hiddenParts,
  hoveredPart,
  showEnglish,
  onSelect,
  onHover,
  onToggleVisibility,
  onApplyPreset,
  activePreset,
}: Props) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/10 p-3">
        <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
          <LayersIcon className="size-3.5" />
          عروض جاهزة — أخفِ الطبقات لرؤية الداخل
        </p>
        <div className="flex flex-wrap gap-1.5">
          {VIEW_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onApplyPreset(preset.hidden)}
              className={`rounded-lg px-2.5 py-1.5 text-[11.5px] font-semibold transition ${
                activePreset === preset.id
                  ? "bg-teal-400/20 text-teal-200 ring-1 ring-teal-400/40"
                  : "bg-white/5 text-slate-300 ring-1 ring-white/10 hover:bg-white/10 hover:text-white"
              }`}
            >
              {preset.labelAr}
            </button>
          ))}
        </div>
      </div>

      <div className="scroll-slim flex-1 overflow-y-auto p-2">
        {GROUP_ORDER.map((group) => {
          const parts = EYE_PARTS.filter((part) => part.group === group);
          return (
            <div key={group} className="mb-3">
              <h3 className="px-2 py-1.5 text-[10.5px] font-bold tracking-wide text-slate-500">
                {LAYER_GROUPS[group].ar}
                <span className="mx-1.5 text-slate-700">|</span>
                <span className="font-medium text-slate-600">{LAYER_GROUPS[group].en}</span>
              </h3>
              <ul className="space-y-1">
                {parts.map((part) => {
                  const hidden = hiddenParts.has(part.id);
                  return (
                    <li key={part.id}>
                      <div
                        onMouseEnter={() => onHover(part.id)}
                        onMouseLeave={() => onHover(null)}
                        className={`group flex items-center gap-2 rounded-xl px-2 py-2 transition ${
                          hoveredPart === part.id ? "bg-white/10" : "hover:bg-white/5"
                        } ${hidden ? "opacity-45" : ""}`}
                      >
                        <button
                          type="button"
                          onClick={() => onSelect(part.id)}
                          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 text-start"
                        >
                          <span
                            className="size-2.5 shrink-0 rounded-full ring-2 ring-white/15"
                            style={{ background: part.color }}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13.5px] font-bold text-slate-100">
                              {showEnglish ? part.nameEn : part.nameAr}
                            </span>
                            <span className="block truncate text-[10.5px] text-slate-500">
                              {showEnglish ? part.nameAr : part.nameEn}
                            </span>
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onToggleVisibility(part.id)}
                          title={hidden ? "إظهار" : "إخفاء"}
                          aria-label={`${hidden ? "إظهار" : "إخفاء"} ${part.nameAr}`}
                          className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-lg text-slate-500 transition hover:bg-white/10 hover:text-teal-300"
                        >
                          {hidden ? <EyeOffIcon className="size-3.5" /> : <EyeIcon className="size-3.5" />}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
