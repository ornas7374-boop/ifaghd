import { z } from "zod";

export const CURRENT_YEAR = new Date().getFullYear();

export const recordInputSchema = z.object({
  year: z.coerce.number().int().min(2000).max(CURRENT_YEAR + 10),
  month: z.coerce.number().int().min(0).max(12),
  animalTypeId: z.coerce.number().int().positive(),
  births: z.coerce.number().int().min(0).max(10_000_000),
  deaths: z.coerce.number().int().min(0).max(10_000_000),
  feedQuantity: z.coerce.number().min(0).max(1_000_000_000),
});

export const recordUpdateSchema = recordInputSchema.omit({ year: true, month: true, animalTypeId: true });

export const animalTypeInputSchema = z.object({
  nameAr: z.string().trim().min(2, "الاسم قصير جدًا").max(50, "الاسم طويل جدًا"),
});
