import type { StorageAdapter } from "./adapter";
import { LocalStorageAdapter } from "./local";

// لتبديل المخزن لاحقًا (Supabase مثلًا) غيّر هذا السطر فقط.
export const storage: StorageAdapter = new LocalStorageAdapter();

export type { StorageAdapter };
