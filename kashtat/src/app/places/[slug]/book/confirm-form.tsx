"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { confirmBooking, type BookState } from "./actions";

type Hidden = Record<string, string | string[] | undefined>;

export function ConfirmForm({ fields }: { fields: Hidden }) {
  const [state, action, pending] = useActionState<BookState, FormData>(confirmBooking, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      {Object.entries(fields).flatMap(([name, v]) =>
        v === undefined
          ? []
          : (Array.isArray(v) ? v : [v]).map((val) => (
              <input key={`${name}-${val}`} type="hidden" name={name} value={val} />
            )),
      )}
      {state.error && (
        <p role="alert" className="rounded-md bg-danger-subtle px-4 py-3 text-body-sm text-danger">
          {state.error}
        </p>
      )}
      <Button type="submit" size="lg" fullWidth loading={pending}>
        {pending ? "جارٍ تأكيد الحجز…" : "تأكيد الحجز"}
      </Button>
    </form>
  );
}
