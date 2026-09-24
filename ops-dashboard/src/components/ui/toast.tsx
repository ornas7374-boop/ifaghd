"use client";

import { CheckCircle2, Info, XCircle } from "lucide-react";
import { createContext, useCallback, useContext, useRef, useState } from "react";
import { cn } from "@/lib/format";

type Tone = "success" | "error" | "info";
interface Toast {
  id: number;
  title: string;
  description?: string;
  tone: Tone;
  onUndo?: () => void;
}

const Ctx = createContext<(t: Omit<Toast, "id">) => void>(() => {});
export const useToast = () => useContext(Ctx);

const icons = { success: CheckCircle2, error: XCircle, info: Info };
const tones = { success: "text-success", error: "text-danger", info: "text-info" };

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);

  const dismiss = useCallback((id: number) => setToasts((ts) => ts.filter((t) => t.id !== id)), []);
  const push = useCallback(
    (t: Omit<Toast, "id">) => {
      const id = ++seq.current;
      setToasts((ts) => [...ts.slice(-2), { ...t, id }]);
      setTimeout(() => dismiss(id), t.onUndo ? 6000 : 4000);
    },
    [dismiss],
  );

  return (
    <Ctx.Provider value={push}>
      {children}
      <div aria-live="polite" className="toast-region pointer-events-none fixed bottom-4 right-4 z-[90] flex w-[340px] max-w-[calc(100vw-2rem)] flex-col gap-2 max-md:bottom-20">
        {toasts.map((t) => {
          const Icon = icons[t.tone];
          return (
            <div key={t.id} role="status" className="anim-slide-up pointer-events-auto flex items-start gap-2.5 rounded-[10px] border border-border-strong bg-surface-2 px-3 py-2.5 shadow-[var(--shadow-pop)]">
              <Icon className={cn("mt-px size-4 shrink-0", tones[t.tone])} strokeWidth={1.5} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-fg">{t.title}</p>
                {t.description && <p className="mt-0.5 text-[12px] text-muted">{t.description}</p>}
              </div>
              {t.onUndo && (
                <button
                  type="button"
                  onClick={() => {
                    t.onUndo?.();
                    dismiss(t.id);
                  }}
                  className="-my-0.5 shrink-0 rounded-[5px] px-1.5 py-0.5 text-[12px] font-medium text-accent hover:bg-accent-soft"
                >
                  Undo
                </button>
              )}
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}
