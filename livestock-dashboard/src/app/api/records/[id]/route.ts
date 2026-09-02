import { NextResponse } from "next/server";
import { z } from "zod";
import { deleteRecordById, getRecordById, updateRecordById } from "@/lib/queries";
import { recordUpdateSchema } from "@/lib/validation";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "معرّف غير صالح" }, { status: 400 });
  }

  const existing = getRecordById(id);
  if (!existing) {
    return NextResponse.json({ error: "السجل غير موجود" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const parsed = recordUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: z.prettifyError(parsed.error) }, { status: 400 });
  }

  updateRecordById(id, parsed.data);
  return NextResponse.json({ data: getRecordById(id) });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "معرّف غير صالح" }, { status: 400 });
  }

  const existing = getRecordById(id);
  if (!existing) {
    return NextResponse.json({ error: "السجل غير موجود" }, { status: 404 });
  }

  deleteRecordById(id);
  return NextResponse.json({ data: { id } });
}
