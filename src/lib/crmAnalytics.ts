/**
 * Server-side analytics for the live CRM database (2026).
 */

import { format } from "date-fns";
import { tr } from "date-fns/locale";
import {
  campusMatchesParent,
  getParentLabel,
  getParentUniversity,
  UNPARSED_PARENT,
} from "./campusNormalization";
import { getCrmPool } from "./crmDb";
import type {
  BreakdownPoint,
  CrmAnalyticsResponse,
  CrmDashboardFilters,
  CrmFilterOptionsResponse,
  Granularity,
  SchoolTableRow,
  TimeSeriesPoint,
} from "./types";

interface WhereClause {
  sql: string;
  params: unknown[];
}

const INCOMING_MESSAGE_FILTER = `
  lm.is_private = false
  AND (lm.direction = 'incoming' OR lm.message_type = 'incoming')
`;

/**
 * Loads distinct campus values for parent filter expansion.
 */
async function loadCampusValues(): Promise<string[]> {
  const pool = getCrmPool();
  const { rows } = await pool.query(
    `SELECT DISTINCT ld.university AS campus
     FROM lead_details ld
     JOIN leads l ON l.uuid = ld.lead_uuid
     WHERE l.is_deleted = false
       AND ld.university IS NOT NULL
       AND ld.university <> ''`,
  );
  return rows.map((row) => row.campus as string);
}

/**
 * Resolves parent-university filters to campus names for SQL.
 */
async function resolveCampusFilters(parents: string[]): Promise<string[]> {
  if (parents.length === 0) return [];
  const campuses = await loadCampusValues();
  return campuses.filter((campus) => campusMatchesParent(campus, parents));
}

function appendCampusFilter(
  parts: string[],
  params: unknown[],
  campuses: string[],
  column: string,
): void {
  if (campuses.length === 0) return;
  params.push(campuses);
  parts.push(`${column} = ANY($${params.length}::text[])`);
}

function appendSchoolFilter(
  parts: string[],
  params: unknown[],
  parentFilters: string[],
  campuses: string[],
): void {
  if (parentFilters.length === 0) return;

  const includesUnparsed = parentFilters.includes(UNPARSED_PARENT);

  if (campuses.length > 0 && includesUnparsed) {
    params.push(campuses);
    parts.push(
      `(ld.university = ANY($${params.length}::text[]) OR ld.university IS NULL OR ld.university = '' OR ld.university = 'bilinmiyor')`,
    );
    return;
  }

  if (includesUnparsed) {
    parts.push(
      `(ld.university IS NULL OR ld.university = '' OR ld.university = 'bilinmiyor')`,
    );
    return;
  }

  appendCampusFilter(parts, params, campuses, "ld.university");
}

async function buildMessageWhere(
  filters: CrmDashboardFilters,
): Promise<WhereClause> {
  const parts = [`l.is_deleted = false`, INCOMING_MESSAGE_FILTER];
  const params: unknown[] = [];

  if (filters.startDate) {
    params.push(filters.startDate);
    parts.push(`lm.created_at >= $${params.length}::timestamp`);
  }
  if (filters.endDate) {
    params.push(filters.endDate);
    parts.push(
      `lm.created_at < ($${params.length}::date + interval '1 day')`,
    );
  }

  const campuses = await resolveCampusFilters(filters.parentUniversities);
  appendSchoolFilter(parts, params, filters.parentUniversities, campuses);

  return { sql: `WHERE ${parts.join(" AND ")}`, params };
}

async function buildLeadWhere(
  filters: CrmDashboardFilters,
): Promise<WhereClause> {
  const parts = ["l.is_deleted = false"];
  const params: unknown[] = [];

  if (filters.startDate) {
    params.push(filters.startDate);
    parts.push(`l.created_at >= $${params.length}::timestamp`);
  }
  if (filters.endDate) {
    params.push(filters.endDate);
    parts.push(
      `l.created_at < ($${params.length}::date + interval '1 day')`,
    );
  }

  const campuses = await resolveCampusFilters(filters.parentUniversities);
  appendSchoolFilter(parts, params, filters.parentUniversities, campuses);

  const sql = parts.length ? `WHERE ${parts.join(" AND ")}` : "";
  return { sql, params };
}

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

function formatWeeklyLabel(date: Date): string {
  const monthName = format(date, "LLLL", { locale: tr });
  const weekOfMonth = Math.ceil(date.getDate() / 7);
  return `${monthName} ${weekOfMonth}. Hafta`;
}

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

function aggregateCampusRows(
  rows: { campus: string; value: number }[],
): BreakdownPoint[] {
  const totals = new Map<string, number>();

  for (const row of rows) {
    const parent = getParentUniversity(row.campus);
    const key = parent === "Belirtilmemiş" ? UNPARSED_PARENT : parent;
    totals.set(key, (totals.get(key) || 0) + row.value);
  }

  return [...totals.entries()]
    .map(([key, value]) => ({
      key,
      name: getParentLabel(key),
      value,
    }))
    .sort((a, b) => b.value - a.value);
}

function mergeSchoolTableRows(
  messageRows: { campus: string; messages: number }[],
  leadRows: { campus: string; leads: number }[],
): SchoolTableRow[] {
  const byParent = new Map<string, SchoolTableRow>();

  for (const row of messageRows) {
    const parent = getParentUniversity(row.campus);
    const key = parent === "Belirtilmemiş" ? UNPARSED_PARENT : parent;
    const existing = byParent.get(key) || {
      key,
      name: getParentLabel(key),
      messages: 0,
      leads: 0,
    };
    existing.messages += row.messages;
    byParent.set(key, existing);
  }

  for (const row of leadRows) {
    const parent = getParentUniversity(row.campus);
    const key = parent === "Belirtilmemiş" ? UNPARSED_PARENT : parent;
    const existing = byParent.get(key) || {
      key,
      name: getParentLabel(key),
      messages: 0,
      leads: 0,
    };
    existing.leads += row.leads;
    byParent.set(key, existing);
  }

  return [...byParent.values()].sort((a, b) => {
    if (b.messages !== a.messages) return b.messages - a.messages;
    if (b.leads !== a.leads) return b.leads - a.leads;
    return a.name.localeCompare(b.name, "tr");
  });
}

export async function getCrmFilterOptions(): Promise<CrmFilterOptionsResponse> {
  const pool = getCrmPool();

  const [campuses, dates] = await Promise.all([
    pool.query(
      `SELECT DISTINCT ld.university AS campus
       FROM lead_details ld
       JOIN leads l ON l.uuid = ld.lead_uuid
       WHERE l.is_deleted = false
         AND ld.university IS NOT NULL
         AND ld.university <> ''`,
    ),
    pool.query(
      `SELECT
         MIN(l.created_at)::date AS lead_min,
         MAX(l.created_at)::date AS lead_max,
         MIN(lm.created_at)::date AS msg_min,
         MAX(lm.created_at)::date AS msg_max
       FROM leads l
       LEFT JOIN lead_messages lm ON lm.lead_uuid = l.uuid
       WHERE l.is_deleted = false`,
    ),
  ]);

  const parentSet = new Map<string, string>();
  parentSet.set(UNPARSED_PARENT, "Belirtilmemiş");

  for (const row of campuses.rows) {
    const parent = getParentUniversity(row.campus as string);
    const key = parent === "Belirtilmemiş" ? UNPARSED_PARENT : parent;
    parentSet.set(key, getParentLabel(key));
  }

  const minDate = [dates.rows[0]?.msg_min, dates.rows[0]?.lead_min]
    .filter(Boolean)
    .map((value) => new Date(value as Date))
    .sort((a, b) => a.getTime() - b.getTime())[0];
  const maxDate = [dates.rows[0]?.msg_max, dates.rows[0]?.lead_max]
    .filter(Boolean)
    .map((value) => new Date(value as Date))
    .sort((a, b) => b.getTime() - a.getTime())[0];

  return {
    parentUniversities: [...parentSet.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "tr")),
    dateRange: {
      min: minDate?.toISOString?.()?.slice(0, 10) ?? "",
      max: maxDate?.toISOString?.()?.slice(0, 10) ?? "",
    },
  };
}

export async function getCrmAnalytics(
  filters: CrmDashboardFilters,
  granularity: Granularity,
): Promise<CrmAnalyticsResponse> {
  const pool = getCrmPool();
  const messageWhere = await buildMessageWhere(filters);
  const leadWhere = await buildLeadWhere(filters);
  const unit = granularityUnit(granularity);

  const messageFrom = `
    FROM lead_messages lm
    INNER JOIN leads l ON l.uuid = lm.lead_uuid
    LEFT JOIN lead_details ld ON ld.lead_uuid = l.uuid
    ${messageWhere.sql}
  `;

  const leadFrom = `
    FROM leads l
    LEFT JOIN lead_details ld ON ld.lead_uuid = l.uuid
    ${leadWhere.sql}
  `;

  const [
    messageTotals,
    leadTotals,
    messageTimeSeries,
    leadTimeSeries,
    messageByCampus,
    leadByCampus,
    schoolTableMessages,
    schoolTableLeads,
  ] = await Promise.all([
    pool.query(
      `SELECT COUNT(*)::int AS count ${messageFrom}`,
      messageWhere.params,
    ),
    pool.query(
      `SELECT COUNT(DISTINCT l.lead_phone)::int AS count ${leadFrom}`,
      leadWhere.params,
    ),
    pool.query(
      `SELECT date_trunc('${unit}', lm.created_at) AS period, COUNT(*)::int AS value
       ${messageFrom}
       GROUP BY 1
       ORDER BY 1 ASC`,
      messageWhere.params,
    ),
    pool.query(
      `SELECT date_trunc('${unit}', l.created_at) AS period,
              COUNT(DISTINCT l.lead_phone)::int AS value
       ${leadFrom}
       GROUP BY 1
       ORDER BY 1 ASC`,
      leadWhere.params,
    ),
    pool.query(
      `SELECT COALESCE(ld.university, 'Belirtilmemiş') AS campus,
              COUNT(*)::int AS value
       ${messageFrom}
       GROUP BY 1
       ORDER BY value DESC`,
      messageWhere.params,
    ),
    pool.query(
      `SELECT COALESCE(ld.university, 'Belirtilmemiş') AS campus,
              COUNT(DISTINCT l.lead_phone)::int AS value
       ${leadFrom}
       GROUP BY 1
       ORDER BY value DESC`,
      leadWhere.params,
    ),
    pool.query(
      `SELECT COALESCE(ld.university, 'Belirtilmemiş') AS campus,
              COUNT(*)::int AS messages
       ${messageFrom}
       GROUP BY 1`,
      messageWhere.params,
    ),
    pool.query(
      `SELECT COALESCE(ld.university, 'Belirtilmemiş') AS campus,
              COUNT(DISTINCT l.lead_phone)::int AS leads
       ${leadFrom}
       GROUP BY 1`,
      leadWhere.params,
    ),
  ]);

  const bySchoolMessages = aggregateCampusRows(messageByCampus.rows);
  const bySchoolLeads = aggregateCampusRows(leadByCampus.rows);

  return {
    totals: {
      incomingMessages: messageTotals.rows[0]?.count ?? 0,
      uniquePhones: leadTotals.rows[0]?.count ?? 0,
    },
    messages: {
      timeSeries: mapTimeSeries(messageTimeSeries.rows, granularity),
      bySchool: bySchoolMessages,
    },
    leads: {
      timeSeries: mapTimeSeries(leadTimeSeries.rows, granularity),
      bySchool: bySchoolLeads,
    },
    bySchoolTable: mergeSchoolTableRows(
      schoolTableMessages.rows,
      schoolTableLeads.rows,
    ),
  };
}
