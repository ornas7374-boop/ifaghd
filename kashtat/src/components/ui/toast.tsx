"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";
import { AlertIcon, CheckIcon, CloseIcon, InfoIcon } from "./icons";

type ToastTone = "success" | "error" | "warning" | "info";

type ToastInput = {
  title: string;
  description?: string;
  tone?: ToastTone;
  /** بالمللي ثانية، 0 = يبقى حتى يُغلق */
  duration?: number;
};

type ToastItem = Required<Omit<ToastInput, "description">> & {
  id: number;
  description?: string;
};

type ToastApi = { toast: (t: ToastInput) => void };

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

const toneStyles: Record<ToastTone, { box: string; icon: ReactNode }> = {
  success: { box: "text-success", icon: <CheckIcon /> },
  error: { box: "text-danger", icon: <AlertIcon /> },
  warning: { box: "text-warning", icon: <AlertIcon /> },
  info: { box: "text-info", icon: <InfoIcon /> },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setItems((list) => list.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((t: ToastInput) => {
    const id = nextId.current++;
    setItems((list) => [
      ...list.slice(-3),
      {
        id,
        title: t.title,
        description: t.description,
        tone: t.tone ?? "info",
        duration: t.duration ?? 5000,
      },
    ]);
  }, []);

  const api = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        aria-relevant="additions"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-center gap-2 sm:inset-x-auto sm:start-6 sm:bottom-6 sm:items-start"
      >
        {items.map((t) => (
          <ToastView key={t.id} item={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastView({ item, onDismiss }: { item: ToastItem; onDismiss: (id: number) => void }) {
  useEffect(() => {
    if (!item.duration) return;
    const timer = setTimeout(() => onDismiss(item.id), item.duration);
    return () => clearTimeout(timer);
  }, [item.id, item.duration, onDismiss]);

  const tone = toneStyles[item.tone];
  return (
    <div
      role={item.tone === "error" ? "alert" : "status"}
      className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border border-border bg-surface-raised p-4 shadow-md"
    >
      <span className={cn("mt-0.5 shrink-0", tone.box)}>{tone.icon}</span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-label font-semibold text-ink">{item.title}</p>
        {item.description && <p className="text-body-sm text-ink-muted">{item.description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        aria-label="إغلاق التنبيه"
        className="-m-2 inline-flex size-9 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface-overlay hover:text-ink"
      >
        <CloseIcon size={18} />
      </button>
    </div>
  );
}
