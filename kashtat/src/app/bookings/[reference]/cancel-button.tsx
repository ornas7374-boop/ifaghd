"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { cancelBooking, type CancelState } from "../actions";

export function CancelButton({ reference, policy }: { reference: string; policy: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<CancelState, FormData>(cancelBooking, {});
  const { toast } = useToast();

  useEffect(() => {
    if (state.done) toast({ tone: "success", title: "تم إلغاء الحجز" });
  }, [state.done, toast]);

  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)}>
        إلغاء الحجز
      </Button>
      <Modal
        open={open && !state.done}
        onClose={() => setOpen(false)}
        title="إلغاء الحجز؟"
        description={policy}
      >
        <form action={action} className="flex flex-col gap-3">
          <input type="hidden" name="reference" value={reference} />
          {state.error && (
            <p
              role="alert"
              className="rounded-md bg-danger-subtle px-4 py-3 text-body-sm text-danger"
            >
              {state.error}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              تراجع
            </Button>
            <Button type="submit" variant="danger" loading={pending}>
              تأكيد الإلغاء
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
