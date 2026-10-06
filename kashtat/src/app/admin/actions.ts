"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServer } from "@/lib/supabase/server";

// كل الإجراءات تتحقق من صلاحية الأدمن داخل قاعدة البيانات (is_admin)، لا في المتصفح

export async function setPlaceStatus(form: FormData) {
  const parsed = z
    .object({
      id: z.uuid(),
      status: z.enum(["draft", "pending", "published", "rejected", "suspended"]),
    })
    .safeParse({ id: form.get("id"), status: form.get("status") });
  if (!parsed.success) return;
  const supabase = await createSupabaseServer();
  const { error } = await supabase.rpc("admin_set_place_status", {
    p_place: parsed.data.id,
    p_status: parsed.data.status,
  });
  if (error) console.error(error);
  revalidatePath("/admin");
  revalidatePath("/places");
  revalidatePath("/");
}

export async function setUserRole(form: FormData) {
  const parsed = z
    .object({ id: z.uuid(), role: z.enum(["customer", "host", "admin"]) })
    .safeParse({ id: form.get("id"), role: form.get("role") });
  if (!parsed.success) return;
  const supabase = await createSupabaseServer();
  const { error } = await supabase.rpc("admin_set_role", {
    p_user: parsed.data.id,
    p_role: parsed.data.role,
  });
  if (error) console.error(error);
  revalidatePath("/admin");
}

export async function setReviewHidden(form: FormData) {
  const parsed = z
    .object({ id: z.uuid(), hidden: z.enum(["true", "false"]) })
    .safeParse({ id: form.get("id"), hidden: form.get("hidden") });
  if (!parsed.success) return;
  const supabase = await createSupabaseServer();
  // سياسة "admin moderates reviews" تسمح للأدمن فقط
  const { error } = await supabase
    .from("reviews")
    .update({ is_hidden: parsed.data.hidden === "true" })
    .eq("id", parsed.data.id);
  if (error) console.error(error);
  revalidatePath("/admin");
}
