/**
 * Server-side analytics queries against the Chatwoot schema.
 */

import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { getPool } from "./db";
import type {
  AnalyticsResponse,
  BreakdownPoint,
  DashboardFilters,
  FilterOptionsResponse,
  Granularity,
  MetricBundle,
  SchoolTableRow,
  TimeSeriesPoint,
} from "./types";
import { UNPARSED_UNIVERSITY } from "./types";

interface WhereClause {
  sql: string;
  params: unknown[];
}

/**
 * Builds university filter SQL for conversation-linked queries.
 */
function appendUniversityFilter(
  parts: string[],
  params: unknown[],
  universities: string[],
  column = "c.university",
): void {
  if (universities.length === 0) return;

  const named = universities.filter((item) => item !== UNPARSED_UNIVERSITY);
  const includeUnparsed = universities.includes(UNPARSED_UNIVERSITY);

  if (named.length > 0 && includeUnparsed) {
    params.push(named);
    parts.push(`(${column} = ANY($${params.length}::text[]) OR ${column} IS NULL)`);
    return;
  }

  if (includeUnparsed) {
    parts.push(`${column} IS NULL`);
    return;
  }

  params.push(named);
  parts.push(`${column} = ANY($${params.length}::text[])`);
}

/**
 * Builds WHERE clause for message queries (alias m, join c).
 */
function buildMessageWhere(filters: DashboardFilters): WhereClause {
  const parts: string[] = [];
  const params: unknown[] = [];

  if (filters.startDate) {
    params.push(filters.startDate);
    parts.push(`m.created_at >= $${params.length}::timestamp`);
  }
  if (filters.endDate) {
    params.push(filters.endDate);
    parts.push(
      `m.created_at < ($${params.length}::date + interval '1 day')`,
    );
  }
  appendUniversityFilter(parts, params, filters.universities);
  if (filters.channelIds.length > 0) {
    params.push(filters.channelIds);
    parts.push(`m.inbox_id = ANY($${params.length}::int[])`);
  }

  const sql = parts.length ? `WHERE ${parts.join(" AND ")}` : "";
  return { sql, params };
}

/**
 * Builds WHERE clause for lead (conversation) queries (alias c).
 */
function buildLeadWhere(filters: DashboardFilters): WhereClause {
  const parts: string[] = [];
  const params: unknown[] = [];

  if (filters.startDate) {
    params.push(filters.startDate);
    parts.push(`c.created_at >= $${params.length}::timestamp`);
  }
  if (filters.endDate) {
    params.push(filters.endDate);
    parts.push(
      `c.created_at < ($${params.length}::date + interval '1 day')`,
    );
  }
  appendUniversityFilter(parts, params, filters.universities, "c.university");
  if (filters.channelIds.length > 0) {
    params.push(filters.channelIds);
    parts.push(`c.inbox_id = ANY($${params.length}::int[])`);
  }

  const sql = parts.length ? `WHERE ${parts.join(" AND ")}` : "";
  return { sql, params };
}

/**
 * Maps UI granularity to PostgreSQL date_trunc unit.
 */
function granularityUnit(granularity: Granularity): string {
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

/**
 * Formats a week bucket as "Ağustos 1. Hafta" based on the week's start date.
 */
function formatWeeklyLabel(date: Date): string {
  const monthName = format(date, "LLLL", { locale: tr });
  const weekOfMonth = Math.ceil(date.getDate() / 7);
  return `${monthName} ${weekOfMonth}. Hafta`;
}

/**
 * Formats a bucket timestamp for chart axis labels.
 */
function formatPeriodLabel(date: Date, granularity: Granularity): string {
  switch (granularity) {
    case "daily":
      return format(date, "d MMM yyyy", { locale: tr });
    case "weekly":
      return formatWeeklyLabel(date);
    case "monthly":
      return format(date, "MMM yyyy", { locale: tr });
    case "yearly":
      return format(date, "yyyy", { locale: tr });
    default:
      return format(date, "PP", { locale: tr });
  }
}

/**
 * Loads filter dropdown options and available date bounds.
 */
export async function getFilterOptions(): Promise<FilterOptionsResponse> {
  const pool = getPool();

  const [universities, channels, messageDates, conversationDates] =
    await Promise.all([
      pool.query(
        `SELECT DISTINCT c.university AS name
         FROM conversations c
         WHERE c.university IS NOT NULL
         ORDER BY c.university ASC`,
      ),
      pool.query(
        `SELECT i.id, i.name
         FROM inboxes i
         ORDER BY i.name ASC`,
      ),
      pool.query(
        `SELECT MIN(created_at)::date AS min, MAX(created_at)::date AS max
         FROM messages`,
      ),
      pool.query(
        `SELECT MIN(created_at)::date AS min, MAX(created_at)::date AS max
         FROM conversations`,
      ),
    ]);

  const minDate = [messageDates.rows[0]?.min, conversationDates.rows[0]?.min]
    .filter(Boolean)
    .map((value) => new Date(value as Date))
    .sort((a, b) => a.getTime() - b.getTime())[0];
  const maxDate = [messageDates.rows[0]?.max, conversationDates.rows[0]?.max]
    .filter(Boolean)
    .map((value) => new Date(value as Date))
    .sort((a, b) => b.getTime() - a.getTime())[0];

  return {
    universities: [
      {
        id: UNPARSED_UNIVERSITY,
        name: "Belirtilmemiş",
      },
      ...universities.rows.map((row) => ({
        id: row.name as string,
        name: row.name as string,
      })),
    ],
    channels: channels.rows.map((row) => ({
      id: row.id as number,
      name: row.name as string,
    })),
    dateRange: {
      min: minDate?.toISOString?.()?.slice(0, 10) ?? "",
      max: maxDate?.toISOString?.()?.slice(0, 10) ?? "",
    },
  };
}

/**
 * Maps SQL time-series rows to chart points.
 */
function mapTimeSeries(
  rows: { period: Date; value: number }[],
  granularity: Granularity,
): TimeSeriesPoint[] {
  return rows.map((row) => {
    const periodDate = new Date(row.period);
    return {
      period: periodDate.toISOString(),
      label: formatPeriodLabel(periodDate, granularity),
      value: row.value,
    };
  });
}

/**
 * Maps SQL breakdown rows to pie chart points.
 */
function mapBreakdown(
  rows: { key: string; name: string; value: number }[],
): BreakdownPoint[] {
  return rows.map((row) => ({
    key: row.key,
    name: row.name,
    value: row.value,
  }));
}

/**
 * Combines per-school message and lead counts into one table payload.
 */
function mergeSchoolTableRows(
  messageRows: { key: string; name: string; messages: number }[],
  leadRows: { key: string; name: string; leads: number }[],
): SchoolTableRow[] {
  const byKey = new Map<string, SchoolTableRow>();

  for (const row of messageRows) {
    byKey.set(row.key, {
      key: row.key,
      name: row.name,
      messages: row.messages,
      leads: 0,
    });
  }

  for (const row of leadRows) {
    const existing = byKey.get(row.key);
    if (existing) {
      existing.leads = row.leads;
      continue;
    }
    byKey.set(row.key, {
      key: row.key,
      name: row.name,
      messages: 0,
      leads: row.leads,
    });
  }

  return [...byKey.values()].sort((a, b) => {
    if (b.messages !== a.messages) return b.messages - a.messages;
    if (b.leads !== a.leads) return b.leads - a.leads;
    return a.name.localeCompare(b.name, "tr");
  });
}

/**
 * Fetches aggregated analytics for the dashboard.
 */
export async function getAnalytics(
  filters: DashboardFilters,
  granularity: Granularity,
): Promise<AnalyticsResponse> {
  const pool = getPool();
  const messageWhere = buildMessageWhere(filters);
  const leadWhere = buildLeadWhere(filters);
  const unit = granularityUnit(granularity);

  const messageFrom = `
    FROM messages m
    INNER JOIN conversations c ON c.id = m.conversation_id
    ${messageWhere.sql}
  `;

  const leadFrom = `
    FROM conversations c
    ${leadWhere.sql}
  `;

  const [
    messageTotals,
    leadTotals,
    messageTimeSeries,
    leadTimeSeries,
    messageBySchool,
    leadBySchool,
    messageByChannel,
    leadByChannel,
    schoolTableMessages,
    schoolTableLeads,
  ] = await Promise.all([
    pool.query(
      `SELECT COUNT(*)::int AS count ${messageFrom}`,
      messageWhere.params,
    ),
    pool.query(
      `SELECT COUNT(*)::int AS count ${leadFrom}`,
      leadWhere.params,
    ),
    pool.query(
      `SELECT date_trunc('${unit}', m.created_at) AS period, COUNT(*)::int AS value
       ${messageFrom}
       GROUP BY 1
       ORDER BY 1 ASC`,
      messageWhere.params,
    ),
    pool.query(
      `SELECT date_trunc('${unit}', c.created_at) AS period, COUNT(*)::int AS value
       ${leadFrom}
       GROUP BY 1
       ORDER BY 1 ASC`,
      leadWhere.params,
    ),
    pool.query(
      `SELECT
         COALESCE(c.university, '${UNPARSED_UNIVERSITY}') AS key,
         COALESCE(c.university, 'Belirtilmemiş') AS name,
         COUNT(*)::int AS value
       ${messageFrom}
       GROUP BY 1, 2
       ORDER BY value DESC`,
      messageWhere.params,
    ),
    pool.query(
      `SELECT
         COALESCE(c.university, '${UNPARSED_UNIVERSITY}') AS key,
         COALESCE(c.university, 'Belirtilmemiş') AS name,
         COUNT(*)::int AS value
       ${leadFrom}
       GROUP BY 1, 2
       ORDER BY value DESC`,
      leadWhere.params,
    ),
    pool.query(
      `SELECT
         i.id::text AS key,
         i.name AS name,
         COUNT(*)::int AS value
       FROM messages m
       INNER JOIN conversations c ON c.id = m.conversation_id
       INNER JOIN inboxes i ON i.id = m.inbox_id
       ${messageWhere.sql}
       GROUP BY i.id, i.name
       ORDER BY value DESC`,
      messageWhere.params,
    ),
    pool.query(
      `SELECT
         i.id::text AS key,
         i.name AS name,
         COUNT(*)::int AS value
       FROM conversations c
       INNER JOIN inboxes i ON i.id = c.inbox_id
       ${leadWhere.sql}
       GROUP BY i.id, i.name
       ORDER BY value DESC`,
      leadWhere.params,
    ),
    pool.query(
      `SELECT
         COALESCE(c.university, '${UNPARSED_UNIVERSITY}') AS key,
         COALESCE(c.university, 'Belirtilmemiş') AS name,
         COUNT(*)::int AS messages
       ${messageFrom}
       GROUP BY 1, 2
       ORDER BY messages DESC`,
      messageWhere.params,
    ),
    pool.query(
      `SELECT
         COALESCE(c.university, '${UNPARSED_UNIVERSITY}') AS key,
         COALESCE(c.university, 'Belirtilmemiş') AS name,
         COUNT(*)::int AS leads
       ${leadFrom}
       GROUP BY 1, 2
       ORDER BY leads DESC`,
      leadWhere.params,
    ),
  ]);

  const messages: MetricBundle = {
    timeSeries: mapTimeSeries(messageTimeSeries.rows, granularity),
    bySchool: mapBreakdown(messageBySchool.rows),
    byChannel: mapBreakdown(messageByChannel.rows),
  };

  const leads: MetricBundle = {
    timeSeries: mapTimeSeries(leadTimeSeries.rows, granularity),
    bySchool: mapBreakdown(leadBySchool.rows),
    byChannel: mapBreakdown(leadByChannel.rows),
  };

  const bySchoolTable = mergeSchoolTableRows(
    schoolTableMessages.rows,
    schoolTableLeads.rows,
  );

  return {
    totals: {
      messages: messageTotals.rows[0]?.count ?? 0,
      leads: leadTotals.rows[0]?.count ?? 0,
    },
    messages,
    leads,
    bySchoolTable,
  };
}
