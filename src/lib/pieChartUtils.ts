/**
 * Shared helpers for dashboard pie charts.
 */
import type { BreakdownPoint } from "./types";

export const PIE_COLORS = [
  "#7c3aed",
  "#059669",
  "#d97706",
  "#dc2626",
  "#2563eb",
  "#0891b2",
  "#db2777",
  "#65a30d",
  "#ea580c",
  "#4f46e5",
];

/** Collapses long tails beyond maxSlices into a single "Diğer" slice. */
export function preparePieData(
  data: BreakdownPoint[],
  maxSlices: number,
): BreakdownPoint[] {
  const enriched = data
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);

  if (enriched.length <= maxSlices) return enriched;

  const head = enriched.slice(0, maxSlices - 1);
  const tailSum = enriched
    .slice(maxSlices - 1)
    .reduce((sum, item) => sum + item.value, 0);

  return [...head, { key: "other", name: "Diğer", value: tailSum }];
}
