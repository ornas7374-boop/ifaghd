export const DEFAULT_YEARS = [2024, 2025, 2026];

export function mergeYears(existing: number[]): number[] {
  const currentYear = new Date().getFullYear();
  const set = new Set<number>([...DEFAULT_YEARS, ...existing, currentYear]);
  return Array.from(set).sort((a, b) => b - a);
}
