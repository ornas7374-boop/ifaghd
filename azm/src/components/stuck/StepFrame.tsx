import Link from "next/link";
import type { ReactNode } from "react";
import { IconX } from "../ui/icons";

export const STEP_COUNT = 5;

export function StepFrame({
  step,
  title,
  subtitle,
  children,
  footer,
}: {
  step?: number; // 1..5 — بدون رقم ما نعرض المؤشر
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-[100dvh] flex-col pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      <div className="flex items-center justify-between py-2">
        {step ? (
          <div className="flex gap-1.5" aria-label={`الخطوة ${step} من ${STEP_COUNT}`}>
            {Array.from({ length: STEP_COUNT }, (_, i) => (
              <span key={i} className={`h-1.5 w-7 rounded-full ${i < step ? "bg-accent" : "bg-line"}`} />
            ))}
          </div>
        ) : (
          <span />
        )}
        <Link href="/" aria-label="خروج" className="grid size-11 place-items-center rounded-full text-muted hover:text-fg">
          <IconX />
        </Link>
      </div>

      <div className="mt-4">
        <h1 className="text-3xl font-bold leading-snug">{title}</h1>
        {subtitle && <p className="mt-2 text-lg text-muted">{subtitle}</p>}
      </div>

      <div className="mt-6 flex-1">{children}</div>

      {footer && <div className="mt-6 space-y-3">{footer}</div>}
    </div>
  );
}
