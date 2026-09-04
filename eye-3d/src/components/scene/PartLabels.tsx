"use client";

import { Html } from "@react-three/drei";
import { EYE_PARTS, type PartId } from "@/data/eyeParts";
import { LABEL_ANCHORS } from "@/lib/geometry";

interface Props {
  hiddenParts: Set<PartId>;
  selectedPart: PartId | null;
  hoveredPart: PartId | null;
  showEnglish: boolean;
  onSelect: (id: PartId) => void;
  onHover: (id: PartId | null) => void;
}

export default function PartLabels({
  hiddenParts,
  selectedPart,
  hoveredPart,
  showEnglish,
  onSelect,
  onHover,
}: Props) {
  return (
    <>
      {EYE_PARTS.filter((part) => !hiddenParts.has(part.id)).map((part) => {
        const active = selectedPart === part.id || hoveredPart === part.id;
        return (
          <Html
            key={part.id}
            position={LABEL_ANCHORS[part.id]}
            center
            zIndexRange={[40, 0]}
            style={{ pointerEvents: "none" }}
          >
            <button
              type="button"
              dir="rtl"
              data-part-label={part.id}
              onClick={(event) => {
                // R3F listens on the canvas *container*, so a label click would
                // otherwise bubble up and register as a click on empty space.
                event.stopPropagation();
                onSelect(part.id);
              }}
              onPointerEnter={() => onHover(part.id)}
              onPointerLeave={() => onHover(null)}
              className={`pointer-events-auto flex -translate-y-1/2 cursor-pointer items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] leading-tight whitespace-nowrap backdrop-blur-md transition-all duration-200 sm:px-2.5 sm:py-1 sm:text-[11px] ${
                active
                  ? "border-teal-300/80 bg-teal-400/25 text-teal-50 shadow-[0_0_18px_rgba(45,212,191,0.45)]"
                  : "border-white/15 bg-slate-950/55 text-slate-200 hover:border-teal-300/50 hover:bg-slate-900/70"
              }`}
            >
              <span className="size-1.5 shrink-0 rounded-full bg-teal-300" />
              <span className="font-semibold">{showEnglish ? part.nameEn : part.nameAr}</span>
              <span className="hidden text-[9px] text-slate-400 sm:inline">
                {showEnglish ? part.nameAr : part.nameEn}
              </span>
            </button>
          </Html>
        );
      })}
    </>
  );
}
