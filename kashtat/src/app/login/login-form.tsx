"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { signIn, signUp, type AuthState } from "./actions";

type Mode = "signin" | "signup";

export function LoginForm({ next, initialMode }: { next: string; initialMode: Mode }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [inState, inAction, inPending] = useActionState<AuthState, FormData>(signIn, {});
  const [upState, upAction, upPending] = useActionState<AuthState, FormData>(signUp, {});
  const state = mode === "signin" ? inState : upState;

  return (
    <div className="flex flex-col gap-6">
      <div
        role="group"
        aria-label="نوع الدخول"
        className="grid grid-cols-2 gap-1 rounded-md bg-surface-overlay p-1"
      >
        {(
          [
            ["signin", "تسجيل الدخول"],
            ["signup", "حساب جديد"],
          ] as const
        ).map(([m, label]) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => setMode(m)}
            className={cn(
              "h-11 cursor-pointer rounded-[8px] text-label font-semibold transition-colors",
              mode === m ? "bg-surface-raised text-ink shadow-sm" : "text-ink-muted hover:text-ink",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {state.error && (
        <p role="alert" className="rounded-md bg-danger-subtle px-4 py-3 text-body-sm text-danger">
          {state.error}
        </p>
      )}
      {state.info && (
        <p
          role="status"
          className="rounded-md bg-success-subtle px-4 py-3 text-body-sm text-success"
        >
          {state.info}
        </p>
      )}

      {mode === "signin" ? (
        <form
          action={inAction}
          className="flex flex-col gap-4"
          key={`signin-${inState.nonce ?? 0}`}
        >
          <input type="hidden" name="next" value={next} />
          <Input
            label="البريد الإلكتروني"
            name="email"
            type="email"
            dir="ltr"
            autoComplete="email"
            required
            defaultValue={inState.fields?.email}
          />
          <Input
            label="كلمة المرور"
            name="password"
            type="password"
            dir="ltr"
            autoComplete="current-password"
            required
          />
          <Button type="submit" size="lg" fullWidth loading={inPending}>
            دخول
          </Button>
        </form>
      ) : (
        <form
          action={upAction}
          className="flex flex-col gap-4"
          key={`signup-${upState.nonce ?? 0}`}
        >
          <input type="hidden" name="next" value={next} />
          <Input
            label="الاسم"
            name="fullName"
            autoComplete="name"
            required
            defaultValue={upState.fields?.fullName}
          />
          <Input
            label="رقم الجوال (اختياري)"
            name="phone"
            type="tel"
            dir="ltr"
            inputMode="numeric"
            autoComplete="tel"
            placeholder="05xxxxxxxx"
            defaultValue={upState.fields?.phone}
          />
          <Input
            label="البريد الإلكتروني"
            name="email"
            type="email"
            dir="ltr"
            autoComplete="email"
            required
            defaultValue={upState.fields?.email}
          />
          <Input
            label="كلمة المرور"
            name="password"
            type="password"
            dir="ltr"
            autoComplete="new-password"
            minLength={8}
            required
            hint="8 أحرف على الأقل"
          />
          <label className="flex min-h-11 cursor-pointer items-center gap-2.5">
            <input type="checkbox" name="isHost" className="size-[18px] accent-[var(--brand)]" />
            أنا صاحب مكان وأبي أعرض مكاني
          </label>
          <Button type="submit" size="lg" fullWidth loading={upPending}>
            إنشاء الحساب
          </Button>
        </form>
      )}
    </div>
  );
}
