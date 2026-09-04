import { NextResponse } from "next/server";
import { z } from "zod";
import { findRecord, listRecords, upsertRecord } from "@/lib/queries";
import { recordInputSchema } from "@/lib/validation";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const yearParam = searchParams.get("year");
  const monthParam = searchParams.get("month");
  const animalTypeIdParam = searchParams.get("animalTypeId");
  const lookup = searchParams.get("lookup");

  const year = yearParam ? Number(yearParam) : undefined;
  const month = monthParam !== null ? Number(monthParam) : undefined;
  const animalTypeId = animalTypeIdParam ? Number(animalTypeIdParam) : undefined;

  if (lookup === "1" && year !== undefined && month !== undefined && animalTypeId) {
    const record = findRecord(year, month, animalTypeId);
    return NextResponse.json({ data: record ?? null });
  }

  const data = listRecords({ year, month, animalTypeId });
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const parsed = recordInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: z.prettifyError(parsed.error) }, { status: 400 });
  }

  try {
    const result = upsertRecord(parsed.data);
    return NextResponse.json(
      { data: result },
      { status: result.created ? 201 : 200 }
    );
  } catch {
    return NextResponse.json({ error: "تعذر حفظ البيانات" }, { status: 500 });
  }
}
