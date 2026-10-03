"use client";

import { useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { ChevronDownIcon } from "./icons";

export const controlClasses =
  "h-12 w-full min-w-0 rounded-md border border-border-strong bg-surface px-3.5 text-body text-ink placeholder:text-ink-muted transition-colors hover:border-ink-muted disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-danger";

type FieldProps = {
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  children: (ids: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode;
};

/** يربط التسمية والتلميح والخطأ بالحقل للوصولية */
export function Field({ label, hint, error, className, children }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <label htmlFor={id} className="text-label font-semibold text-ink">
        {label}
      </label>
      {children({ id, describedBy, invalid: Boolean(error) })}
      {hint && !error && (
        <p id={hintId} className="text-body-sm text-ink-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-body-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

type InputProps = ComponentProps<"input"> & {
  label: string;
  hint?: string;
  error?: string;
  wrapperClassName?: string;
};

export function Input({ label, hint, error, wrapperClassName, className, ...props }: InputProps) {
  return (
    <Field label={label} hint={hint} error={error} className={wrapperClassName}>
      {({ id, describedBy, invalid }) => (
        <input
          id={id}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={cn(controlClasses, className)}
          {...props}
        />
      )}
    </Field>
  );
}

type SelectProps = ComponentProps<"select"> & {
  label: string;
  hint?: string;
  error?: string;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  wrapperClassName?: string;
};

export function Select({
  label,
  hint,
  error,
  options,
  placeholder,
  wrapperClassName,
  className,
  ...props
}: SelectProps) {
  return (
    <Field label={label} hint={hint} error={error} className={wrapperClassName}>
      {({ id, describedBy, invalid }) => (
        <div className="relative">
          <select
            id={id}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            className={cn(controlClasses, "appearance-none pe-10", className)}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <ChevronDownIcon
            size={18}
            className="pointer-events-none absolute end-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
          />
        </div>
      )}
    </Field>
  );
}
