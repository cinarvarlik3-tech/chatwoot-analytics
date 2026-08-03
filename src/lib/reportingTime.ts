/**
 * Single source of truth for the dashboard reporting timezone (UTC+3).
 *
 * Every date bucket, "today"/"this month" column and date-range filter in the
 * system must go through these helpers so the SQL and the rendered labels agree.
 *
 * Why an explicit `AT TIME ZONE` on every query instead of a session timezone:
 * the CRM runs behind Supabase's transaction-mode pooler (port 6543), which
 * drops `-c timezone=...` startup options and hands each query an arbitrary
 * pooled connection, so a `SET TIME ZONE` is not guaranteed to apply. Explicit
 * conversion is the only deterministic option.
 *
 * `Europe/Istanbul` is a fixed +03:00 offset year-round (Turkey abolished DST in
 * 2016), so it is exactly UTC+3 in every month — verified against the live DB.
 */

/** IANA zone for UTC+3. Fixed offset, no DST transitions. */
export const REPORT_TIME_ZONE = "Europe/Istanbul";

/** Converts a `timestamptz` column to UTC+3 wall-clock time. */
export function localTime(column: string): string {
  return `(${column} AT TIME ZONE '${REPORT_TIME_ZONE}')`;
}

/** Current UTC+3 wall-clock time. */
export const NOW_LOCAL = localTime("now()");

/** Maps UI granularity to a PostgreSQL `date_trunc` unit. */
export function granularityUnit(granularity: string): string {
  switch (granularity) {
    case "daily":
      return "day";
    case "weekly":
      return "week";
    case "monthly":
      return "month";
    case "yearly":
      return "year";
    default:
      return "month";
  }
}

/** Time-series bucket aligned to UTC+3 calendar boundaries. */
export function localPeriod(unit: string, column: string): string {
  return `date_trunc('${unit}', ${localTime(column)})`;
}

/**
 * Bucket start serialized as a UTC+3 wall-clock string.
 * Returning text rather than a timestamp keeps chart labels independent of the
 * Node process timezone, which is not guaranteed to match the reporting zone.
 */
export function localPeriodText(unit: string, column: string): string {
  return `to_char(${localPeriod(unit, column)}, 'YYYY-MM-DD"T"HH24:MI:SS')`;
}

/** Matches rows falling on today's UTC+3 calendar date. */
export function todayFilter(column: string): string {
  return `${localTime(column)}::date = ${NOW_LOCAL}::date`;
}

/** Matches rows inside the current UTC+3 calendar month. */
export function currentMonthFilter(column: string): string {
  return `date_trunc('month', ${localTime(column)}) = date_trunc('month', ${NOW_LOCAL})`;
}

/** Inclusive lower bound: rows at or after the UTC+3 start of `param`'s date. */
export function startDateFilter(column: string, param: string): string {
  return `${localTime(column)} >= ${param}::timestamp`;
}

/** Exclusive upper bound: rows before the UTC+3 end of `param`'s date. */
export function endDateFilter(column: string, param: string): string {
  return `${localTime(column)} < (${param}::date + interval '1 day')`;
}

/** Renders a `timestamptz` column as a UTC+3 calendar date (YYYY-MM-DD). */
export function localDateText(column: string): string {
  return `to_char(${localTime(column)}, 'YYYY-MM-DD')`;
}

/**
 * Parses a `localPeriodText` value into a Date whose *local* fields carry the
 * UTC+3 wall-clock values, so date-fns formatting yields UTC+3 labels on any
 * server. Constructed from components rather than `new Date(string)` to avoid
 * relying on engine-specific parsing of offset-less ISO strings.
 */
export function parsePeriodText(value: string): Date {
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/,
  );
  if (!match) return new Date(value);
  const [, year, month, day, hour, minute, second] = match.map(Number);
  return new Date(year, month - 1, day, hour, minute, second);
}
