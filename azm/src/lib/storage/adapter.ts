/**
 * عقد التخزين. أي مخزن (localStorage، Supabase، IndexedDB) يطبّق هالواجهة
 * والمكونات ما تدري وش تحتها. كل الدوال async عشان المخزن البعيد يركب بدون تعديل.
 */
export interface StorageAdapter {
  read<T>(key: string): Promise<T | null>;
  write<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
}
