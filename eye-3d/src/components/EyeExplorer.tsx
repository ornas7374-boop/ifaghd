"use client";

import dynamic from "next/dynamic";
import { Component, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { EYE_PARTS, PART_BY_ID, VIEW_PRESETS, type PartId } from "@/data/eyeParts";
import { useMediaQuery } from "@/lib/useMediaQuery";
import InfoCard from "./ui/InfoCard";
import PartsList from "./ui/PartsList";
import Toolbar from "./ui/Toolbar";
import { BackIcon } from "./ui/icons";

function StageLoader({ message }: { message: string }) {
  return (
    <div className="grid h-full w-full place-items-center">
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="relative grid size-16 place-items-center">
          <span className="animate-pulse-ring absolute inset-0 rounded-full border border-teal-400/60" />
          <span className="size-6 rounded-full bg-teal-400/80" />
        </span>
        <p className="text-sm font-semibold text-slate-400">{message}</p>
      </div>
    </div>
  );
}

/** WebGL can be missing or blocked; the page must still be usable. */
class WebGLBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="grid h-full place-items-center p-8 text-center">
          <div className="max-w-sm space-y-2">
            <p className="text-base font-bold text-slate-200">تعذّر تشغيل العرض ثلاثي الأبعاد</p>
            <p className="text-sm leading-relaxed text-slate-400">
              يبدو أن المتصفح لا يدعم WebGL أو أنه معطّل. جرّب متصفحًا حديثًا أو فعّل تسريع الرسوميات —
              كل المعلومات التعليمية ما زالت متاحة في القائمة الجانبية.
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const EyeCanvas = dynamic(() => import("./scene/EyeCanvas"), {
  ssr: false,
  loading: () => <StageLoader message="جارٍ تجهيز النموذج ثلاثي الأبعاد…" />,
});

export default function EyeExplorer() {
  const [hiddenParts, setHiddenParts] = useState<Set<PartId>>(new Set());
  const [hoveredPart, setHoveredPart] = useState<PartId | null>(null);
  const [selectedPart, setSelectedPart] = useState<PartId | null>(null);
  // Ten floating pills crowd a phone screen, so labels start off there — until
  // the user states a preference with the toolbar button.
  const isPhone = useMediaQuery("(max-width: 639px)");
  const [labelPreference, setLabelPreference] = useState<boolean | null>(null);
  const showLabels = labelPreference ?? !isPhone;
  const [showEnglish, setShowEnglish] = useState(false);
  const [crossSection, setCrossSection] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Rotating the model must never be mistaken for a click on it.
  const pointerDownAt = useRef<{ x: number; y: number } | null>(null);
  const dragged = useRef(false);
  // Remembers the last pick so clicking the same spot drills one layer deeper.
  const lastPick = useRef<{ x: number; y: number; stack: PartId[]; index: number } | null>(null);

  const handleSelect = useCallback((id: PartId) => {
    lastPick.current = null;
    setSelectedPart(id);
    setSheetOpen(true);
  }, []);

  /**
   * A click on the model resolves to the front-most structure. Clicking the
   * same spot again steps to the next structure behind it and wraps around —
   * the fastest way to walk cornea → pupil → lens → vitreous → retina without
   * hiding a single layer.
   */
  const handlePickStack = useCallback(
    (stack: PartId[], screenX: number, screenY: number) => {
      if (dragged.current || !stack.length) return;
      const previous = lastPick.current;
      const sameSpot =
        previous !== null &&
        Math.hypot(previous.x - screenX, previous.y - screenY) < 10 &&
        previous.stack.length === stack.length &&
        previous.stack.every((id, i) => id === stack[i]);

      const index = sameSpot ? (previous.index + 1) % stack.length : 0;
      lastPick.current = { x: screenX, y: screenY, stack, index };
      setSelectedPart(stack[index]);
      setSheetOpen(true);
    },
    [],
  );

  const handleBackgroundClick = useCallback(() => {
    if (dragged.current) return;
    lastPick.current = null;
    setSelectedPart(null);
  }, []);

  const handleClose = useCallback(() => {
    lastPick.current = null;
    setSelectedPart(null);
  }, []);

  const toggleVisibility = useCallback((id: PartId) => {
    setHiddenParts((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const applyPreset = useCallback((hidden: PartId[]) => {
    setHiddenParts(new Set(hidden));
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedPart(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const activePreset = useMemo(() => {
    const match = VIEW_PRESETS.find(
      (preset) =>
        preset.hidden.length === hiddenParts.size &&
        preset.hidden.every((id) => hiddenParts.has(id)),
    );
    return match?.id ?? null;
  }, [hiddenParts]);

  const activePart = selectedPart ? PART_BY_ID[selectedPart] : null;

  return (
    <main className="relative h-[100dvh] w-full overflow-hidden bg-ink">
      {/* ---------- 3D stage ---------- */}
      <div
        onPointerDownCapture={(event) => {
          pointerDownAt.current = { x: event.clientX, y: event.clientY };
          dragged.current = false;
        }}
        onPointerMoveCapture={(event) => {
          const start = pointerDownAt.current;
          if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 6) {
            dragged.current = true;
          }
        }}
        className={`absolute inset-x-0 top-0 bottom-[92px] lg:inset-y-0 lg:start-[380px] lg:end-0 lg:bottom-0 ${
          hoveredPart ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"
        }`}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 50% 45%, rgba(45,212,191,0.10), rgba(7,11,20,0) 62%)",
          }}
        />
        <WebGLBoundary>
          <EyeCanvas
            hiddenParts={hiddenParts}
            hoveredPart={hoveredPart}
            selectedPart={selectedPart}
            crossSection={crossSection}
            showLabels={showLabels}
            showEnglish={showEnglish}
            resetSignal={resetSignal}
            onHover={setHoveredPart}
            onPickStack={handlePickStack}
            onSelectPart={handleSelect}
            onBackgroundClick={handleBackgroundClick}
          />
        </WebGLBoundary>

        {/* Title */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
          <div>
            <h1 className="text-base font-black text-white sm:text-lg">
              العين البشرية — نموذج تشريحي تفاعلي
            </h1>
            <p className="mt-0.5 text-[11px] font-medium text-slate-400 sm:text-xs">
              اضغط على أي جزء لعرض وظيفته ووصفه الطبي · {EYE_PARTS.length} أجزاء تفاعلية
            </p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center px-3 lg:bottom-5">
          <Toolbar
            showLabels={showLabels}
            showEnglish={showEnglish}
            crossSection={crossSection}
            onReset={() => setResetSignal((n) => n + 1)}
            onToggleLabels={() => setLabelPreference(!showLabels)}
            onToggleEnglish={() => setShowEnglish((v) => !v)}
            onToggleCrossSection={() => setCrossSection((v) => !v)}
          />
        </div>

        {/* Desktop hint */}
        <div className="pointer-events-none absolute bottom-5 end-5 hidden text-end text-[11px] font-medium text-slate-500 lg:block">
          <p>اسحب للتدوير · عجلة الماوس للتكبير · اضغط على أي جزء</p>
          <p className="mt-0.5 text-slate-600">
            اضغط مرة أخرى على نفس النقطة للانتقال إلى الطبقة الأعمق
          </p>
        </div>
      </div>

      {/* ---------- Side panel (desktop) / bottom sheet (mobile) ---------- */}
      <aside
        className={`absolute inset-x-0 bottom-0 z-20 flex flex-col overflow-hidden rounded-t-2xl border-t border-white/10 bg-slate-950/85 backdrop-blur-xl transition-[height] duration-300 ease-out lg:inset-y-0 lg:end-auto lg:start-0 lg:h-full lg:w-[380px] lg:rounded-none lg:border-t-0 lg:border-e lg:border-white/10 ${
          sheetOpen ? "h-[68dvh]" : "h-[92px]"
        } lg:h-full`}
      >
        {/* Mobile handle */}
        <button
          type="button"
          onClick={() => setSheetOpen((v) => !v)}
          className="flex shrink-0 cursor-pointer items-center justify-between gap-2 px-4 py-2.5 lg:hidden"
          aria-expanded={sheetOpen}
        >
          <span className="text-[13px] font-bold text-slate-200">
            {activePart ? activePart.nameAr : "أجزاء العين"}
          </span>
          <span
            className={`text-slate-400 transition-transform duration-300 ${sheetOpen ? "-rotate-90" : "rotate-90"}`}
          >
            <BackIcon />
          </span>
        </button>

        {/* Mobile collapsed strip: quick chips */}
        {!sheetOpen && (
          <div className="scroll-slim flex gap-2 overflow-x-auto px-4 pb-3 lg:hidden">
            {EYE_PARTS.map((part) => (
              <button
                key={part.id}
                type="button"
                onClick={() => handleSelect(part.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold whitespace-nowrap ring-1 transition ${
                  selectedPart === part.id
                    ? "bg-teal-400/20 text-teal-100 ring-teal-400/40"
                    : "bg-white/5 text-slate-300 ring-white/10"
                }`}
              >
                <span className="size-2 rounded-full" style={{ background: part.color }} />
                {part.nameAr}
              </button>
            ))}
          </div>
        )}

        {/* Desktop header */}
        <header className="hidden shrink-0 items-center gap-2 border-b border-white/10 px-4 py-3.5 lg:flex">
          <span className="grid size-8 place-items-center rounded-xl bg-teal-400/15 text-teal-300 ring-1 ring-teal-400/25">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="size-4">
              <path d="M2.2 12S5.8 5.5 12 5.5 21.8 12 21.8 12 18.2 18.5 12 18.5 2.2 12 2.2 12Z" strokeLinejoin="round" />
              <circle cx="12" cy="12" r="3.2" />
            </svg>
          </span>
          <div className="min-w-0">
            <p className="text-[13.5px] font-black text-white">مستكشف تشريح العين</p>
            <p className="truncate text-[10.5px] text-slate-500">Interactive Human Eye Anatomy</p>
          </div>
        </header>

        <div className={`min-h-0 flex-1 ${sheetOpen ? "block" : "hidden"} lg:block`}>
          {activePart ? (
            <InfoCard
              part={activePart}
              hidden={hiddenParts.has(activePart.id)}
              onClose={handleClose}
              onToggleVisibility={() => toggleVisibility(activePart.id)}
            />
          ) : (
            <PartsList
              hiddenParts={hiddenParts}
              hoveredPart={hoveredPart}
              showEnglish={showEnglish}
              onSelect={handleSelect}
              onHover={setHoveredPart}
              onToggleVisibility={toggleVisibility}
              onApplyPreset={applyPreset}
              activePreset={activePreset}
            />
          )}
        </div>
      </aside>
    </main>
  );
}
