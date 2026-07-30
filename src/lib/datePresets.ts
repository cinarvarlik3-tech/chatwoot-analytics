/**
 * Quick date range presets for the dashboard header filters.
 */

import { format, startOfYear, subDays } from "date-fns";

export type DatePreset = "all" | "year" | "last30";

/**
 * Formats a Date as YYYY-MM-DD in the local calendar.
 */
export function formatIsoDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/**
 * Returns start/end dates for a header date preset.
 */
export function getPresetDateRange(preset: DatePreset): {
  startDate: string | null;
  endDate: string | null;
} {
  const today = new Date();

  switch (preset) {
    case "all":
      return { startDate: null, endDate: null };
    case "year":
      return {
        startDate: formatIsoDate(startOfYear(today)),
        endDate: formatIsoDate(today),
      };
    case "last30":
      return {
        startDate: formatIsoDate(subDays(today, 29)),
        endDate: formatIsoDate(today),
      };
  }
}

/**
 * Detects whether current filter dates match a known preset.
 */
export function detectDatePreset(
  startDate: string | null,
  endDate: string | null,
): DatePreset | null {
  if (!startDate && !endDate) return "all";

  const today = new Date();
  const todayIso = formatIsoDate(today);

  if (
    startDate === formatIsoDate(startOfYear(today)) &&
    endDate === todayIso
  ) {
    return "year";
  }

  if (startDate === formatIsoDate(subDays(today, 29)) && endDate === todayIso) {
    return "last30";
  }

  return null;
}
