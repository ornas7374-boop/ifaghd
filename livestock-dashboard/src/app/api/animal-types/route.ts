import { NextResponse } from "next/server";
import { z } from "zod";
import { createAnimalType, listAnimalTypes } from "@/lib/queries";
import { animalTypeInputSchema } from "@/lib/validation";

export async function GET() {
  return NextResponse.json({ data: listAnimalTypes() });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const parsed = animalTypeInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: z.prettifyError(parsed.error) },
      { status: 400 }
    );
  }

  try {
    const type = createAnimalType(parsed.data.nameAr);
    return NextResponse.json({ data: type }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "تعذر إضافة نوع الحيوان" }, { status: 500 });
  }
}
