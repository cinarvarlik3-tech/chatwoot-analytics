/**
 * Server-side analytics for the live CRM database (2026).
 */

import { format } from "date-fns";
import { tr } from "date-fns/locale";
import {
  appendSchoolFilter,
  getParentLabel,
  toParentKey,
  UNPARSED_PARENT,
} from "./campusNormalization";
import { getCrmPool } from "./crmDb";
import {
  AUTOMATION_OUTBOUND_MESSAGE_FILTER,
  HUMAN_INCOMING_MESSAGE_FILTER,
  HUMAN_OUTGOING_MESSAGE_FILTER,
} from "./crmMessageFilters";
import {
  endDateFilter,
  granularityUnit,
  localDateText,
  localPeriodText,
  parsePeriodText,
  startDateFilter,
} from "./reportingTime";
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

const INCOMING_MESSAGE_FILTER = HUMAN_INCOMING_MESSAGE_FILTER;

export async function buildMessageWhere(
  filters: CrmDashboardFilters,
  messageFilter: string = INCOMING_MESSAGE_FILTER,
): Promise<WhereClause> {
  const parts = [`l.is_deleted = false`, messageFilter];
  const params: unknown[] = [];

  if (filters.startDate) {
    params.push(filters.startDate);
    parts.push(startDateFilter("lm.created_at", `$${params.length}`));
  }
  if (filters.endDate) {
    params.push(filters.endDate);
    parts.push(endDateFilter("lm.created_at", `$${params.length}`));
  }

  appendSchoolFilter(parts, params, filters.parentUniversities);

  return { sql: `WHERE ${parts.join(" AND ")}`, params };
}

async function buildLeadWhere(
  filters: CrmDashboardFilters,
): Promise<WhereClause> {
  const parts = ["l.is_deleted = false"];
  const params: unknown[] = [];

  if (filters.startDate) {
    params.push(filters.startDate);
    parts.push(startDateFilter("l.created_at", `$${params.length}`));
  }
  if (filters.endDate) {
    params.push(filters.endDate);
    parts.push(endDateFilter("l.created_at", `$${params.length}`));
  }

  appendSchoolFilter(parts, params, filters.parentUniversities);

  const sql = parts.length ? `WHERE ${parts.join(" AND ")}` : "";
  return { sql, params };
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
  rows: { period: string; value: number }[],
  granularity: Granularity,
): TimeSeriesPoint[] {
  return rows.map((row) => ({
    period: row.period,
    label: formatPeriodLabel(parsePeriodText(row.period), granularity),
    value: row.value,
  }));
}

function aggregateCampusRows(
  rows: { campus: string; value: number }[],
): BreakdownPoint[] {
  const totals = new Map<string, number>();

  for (const row of rows) {
    const key = toParentKey(row.campus);
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
    const key = toParentKey(row.campus);
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
    const key = toParentKey(row.campus);
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
    // Canonical schools that actually appear in parsed conversations. Previously
    // this was every distinct free-text `lead_details.university` value, so the
    // dropdown listed campus-level strings and typos as separate options.
    pool.query(
      `SELECT DISTINCT uc.canonical_name AS campus
       FROM lead_university_mentions m
       JOIN university_canonical uc ON uc.id = m.canonical_id
       JOIN leads l ON l.uuid = m.lead_uuid AND l.is_deleted = false`,
    ),
    pool.query(
      `SELECT
         MIN(${localDateText("l.created_at")}) AS lead_min,
         MAX(${localDateText("l.created_at")}) AS lead_max,
         MIN(${localDateText("lm.created_at")}) AS msg_min,
         MAX(${localDateText("lm.created_at")}) AS msg_max
       FROM leads l
       LEFT JOIN lead_messages lm ON lm.lead_uuid = l.uuid
       WHERE l.is_deleted = false`,
    ),
  ]);

  const parentSet = new Map<string, string>();
  parentSet.set(UNPARSED_PARENT, "Belirtilmemiş");

  for (const row of campuses.rows) {
    const key = toParentKey(row.campus as string);
    parentSet.set(key, getParentLabel(key));
  }

  // Already UTC+3 YYYY-MM-DD text; compare as strings to avoid a Date round-trip
  // reinterpreting them in the server's timezone.
  const minDate = [dates.rows[0]?.msg_min, dates.rows[0]?.lead_min]
    .filter(Boolean)
    .sort()[0] as string | undefined;
  const maxDate = [dates.rows[0]?.msg_max, dates.rows[0]?.lead_max]
    .filter(Boolean)
    .sort()
    .reverse()[0] as string | undefined;

  return {
    parentUniversities: [...parentSet.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "tr")),
    dateRange: {
      min: minDate ?? "",
      max: maxDate ?? "",
    },
  };
}

export async function getCrmAnalytics(
  filters: CrmDashboardFilters,
  granularity: Granularity,
): Promise<CrmAnalyticsResponse> {
  const pool = getCrmPool();
  const messageWhere = await buildMessageWhere(filters);
  const automationWhere = await buildMessageWhere(
    filters,
    AUTOMATION_OUTBOUND_MESSAGE_FILTER,
  );
  const humanOutgoingWhere = await buildMessageWhere(
    filters,
    HUMAN_OUTGOING_MESSAGE_FILTER,
  );
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

  // School breakdowns join the parsed mentions.
  //
  // Messages: a LEFT JOIN on every mention, so a lead that named two schools has its
  // messages counted under each of them (once per school, not once per mention).
  // Leads: joined on mention_rank = 1 only, so each lead lands in exactly one school
  // -- the one it named first -- keeping the lead column a clean partition that sums
  // to the total lead count.
  const schoolMessageFrom = `
    FROM lead_messages lm
    INNER JOIN leads l ON l.uuid = lm.lead_uuid
    LEFT JOIN lead_details ld ON ld.lead_uuid = l.uuid
    LEFT JOIN lead_university_mentions m ON m.lead_uuid = l.uuid
    LEFT JOIN university_canonical uc ON uc.id = m.canonical_id
    ${messageWhere.sql}
  `;

  const schoolLeadFrom = `
    FROM leads l
    LEFT JOIN lead_details ld ON ld.lead_uuid = l.uuid
    LEFT JOIN lead_university_mentions m ON m.lead_uuid = l.uuid AND m.mention_rank = 1
    LEFT JOIN university_canonical uc ON uc.id = m.canonical_id
    ${leadWhere.sql}
  `;

  const automationFrom = `
    FROM lead_messages lm
    INNER JOIN leads l ON l.uuid = lm.lead_uuid
    LEFT JOIN lead_details ld ON ld.lead_uuid = l.uuid
    ${automationWhere.sql}
  `;

  const humanOutgoingFrom = `
    FROM lead_messages lm
    INNER JOIN leads l ON l.uuid = lm.lead_uuid
    LEFT JOIN lead_details ld ON ld.lead_uuid = l.uuid
    ${humanOutgoingWhere.sql}
  `;

  const [
    messageTotals,
    automationTotals,
    humanOutgoingTotals,
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
      `SELECT COUNT(*)::int AS count ${automationFrom}`,
      automationWhere.params,
    ),
    pool.query(
      `SELECT COUNT(*)::int AS count ${humanOutgoingFrom}`,
      humanOutgoingWhere.params,
    ),
    pool.query(
      `SELECT COUNT(DISTINCT l.lead_phone)::int AS count ${leadFrom}`,
      leadWhere.params,
    ),
    pool.query(
      `SELECT ${localPeriodText(unit, "lm.created_at")} AS period,
              COUNT(*)::int AS value
       ${messageFrom}
       GROUP BY 1
       ORDER BY 1 ASC`,
      messageWhere.params,
    ),
    pool.query(
      `SELECT ${localPeriodText(unit, "l.created_at")} AS period,
              COUNT(DISTINCT l.lead_phone)::int AS value
       ${leadFrom}
       GROUP BY 1
       ORDER BY 1 ASC`,
      leadWhere.params,
    ),
    pool.query(
      `SELECT COALESCE(uc.canonical_name, 'Belirtilmemiş') AS campus,
              COUNT(*)::int AS value
       ${schoolMessageFrom}
       GROUP BY 1
       ORDER BY value DESC`,
      messageWhere.params,
    ),
    pool.query(
      `SELECT COALESCE(uc.canonical_name, 'Belirtilmemiş') AS campus,
              COUNT(DISTINCT l.lead_phone)::int AS value
       ${schoolLeadFrom}
       GROUP BY 1
       ORDER BY value DESC`,
      leadWhere.params,
    ),
    pool.query(
      `SELECT COALESCE(uc.canonical_name, 'Belirtilmemiş') AS campus,
              COUNT(*)::int AS messages
       ${schoolMessageFrom}
       GROUP BY 1`,
      messageWhere.params,
    ),
    pool.query(
      `SELECT COALESCE(uc.canonical_name, 'Belirtilmemiş') AS campus,
              COUNT(DISTINCT l.lead_phone)::int AS leads
       ${schoolLeadFrom}
       GROUP BY 1`,
      leadWhere.params,
    ),
  ]);

  const bySchoolMessages = aggregateCampusRows(messageByCampus.rows);
  const bySchoolLeads = aggregateCampusRows(leadByCampus.rows);

  const uniquePhones: number = leadTotals.rows[0]?.count ?? 0;
  const humanOutgoingMessages: number = humanOutgoingTotals.rows[0]?.count ?? 0;

  return {
    totals: {
      incomingMessages: messageTotals.rows[0]?.count ?? 0,
      uniquePhones,
      automationMessages: automationTotals.rows[0]?.count ?? 0,
      humanOutgoingMessages,
      humanOutgoingPerLead:
        uniquePhones > 0 ? humanOutgoingMessages / uniquePhones : 0,
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
