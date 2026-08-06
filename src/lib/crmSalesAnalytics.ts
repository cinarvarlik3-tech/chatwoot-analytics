/**
 * Server-side salesperson performance analytics for the live CRM (2026).
 * Counts outbound agent messages and distinct lead conversations.
 */

import { format } from "date-fns";
import { tr } from "date-fns/locale";
import {
  campusMatchesParent,
  UNPARSED_PARENT,
} from "./campusNormalization";
import { getCrmPool } from "./crmDb";
import {
  AUTOMATION_OUTBOUND_MESSAGE_FILTER,
  HUMAN_OUTBOUND_MESSAGE_FILTER,
} from "./crmMessageFilters";
import {
  currentMonthFilter,
  endDateFilter,
  granularityUnit,
  localPeriodText,
  parsePeriodText,
  startDateFilter,
  todayFilter,
} from "./reportingTime";
import type {
  CrmDashboardFilters,
  CrmSalesAnalyticsResponse,
  FilterOption,
  Granularity,
  SalespersonPerformanceRow,
  SalespersonSeriesMeta,
  SalespersonTimeSeriesPoint,
} from "./types";

interface WhereClause {
  sql: string;
  params: unknown[];
}

/** Synthetic agent id for automation/bot outbound messages in charts. */
export const BOT_AGENT_ID = "__bot__";
export const BOT_AGENT_NAME = "Bot";

/**
 * Agents are keyed by the Chatwoot user id carried on the message itself rather
 * than by a `salespeople` row, so an agent who is actively replying appears the
 * day they start instead of waiting for someone to add them to the CRM roster.
 */
const AGENT_ID_SQL = `('cw-' || lm.sender_id::text)`;

/**
 * The roster is advisory: it supplies a tidier display name and still lets a
 * deactivated salesperson stay hidden, but a missing row no longer erases an
 * agent's numbers.
 */
const SALESPERSON_JOIN = `
  LEFT JOIN salespeople sp
    ON sp.chatwoot_user_id = lm.sender_id
`;

/** Roster name when there is one, otherwise the name Chatwoot synced. */
const AGENT_NAME_SQL = `
  COALESCE(
    MAX(sp.full_name),
    MAX(lm.sender_name),
    'Agent #' || lm.sender_id::text
  )
`;

/** Human outbound messages attributable to a named, non-deactivated agent. */
const ATTRIBUTED_AGENT_MESSAGE_FILTER = `
  ${HUMAN_OUTBOUND_MESSAGE_FILTER}
  AND lm.sender_id IS NOT NULL
  AND COALESCE(sp.is_active, true) = true
`;

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

async function resolveCampusFilters(parents: string[]): Promise<string[]> {
  if (parents.length === 0) return [];
  const campuses = await loadCampusValues();
  return campuses.filter((campus) => campusMatchesParent(campus, parents));
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

  if (campuses.length > 0) {
    params.push(campuses);
    parts.push(`ld.university = ANY($${params.length}::text[])`);
  }
}

async function buildOutboundWhere(
  filters: CrmDashboardFilters,
  messageFilter: string,
  options?: { includeDateRange?: boolean },
): Promise<WhereClause> {
  const parts = ["l.is_deleted = false", messageFilter];
  const params: unknown[] = [];
  const includeDateRange = options?.includeDateRange ?? true;

  if (includeDateRange && filters.startDate) {
    params.push(filters.startDate);
    parts.push(startDateFilter("lm.created_at", `$${params.length}`));
  }
  if (includeDateRange && filters.endDate) {
    params.push(filters.endDate);
    parts.push(endDateFilter("lm.created_at", `$${params.length}`));
  }

  const campuses = await resolveCampusFilters(filters.parentUniversities);
  appendSchoolFilter(parts, params, filters.parentUniversities, campuses);

  return { sql: `WHERE ${parts.join(" AND ")}`, params };
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

function pivotTimeSeries(
  rows: {
    period: string;
    salesperson_id: string;
    messages: number;
    conversations: number;
  }[],
  granularity: Granularity,
  selectedIds: Set<string>,
): { messages: SalespersonTimeSeriesPoint[]; conversations: SalespersonTimeSeriesPoint[] } {
  const messagesMap = new Map<string, SalespersonTimeSeriesPoint>();
  const conversationsMap = new Map<string, SalespersonTimeSeriesPoint>();

  for (const row of rows) {
    if (!selectedIds.has(row.salesperson_id)) continue;

    const periodKey = row.period;

    if (!messagesMap.has(periodKey)) {
      const base = {
        period: periodKey,
        label: formatPeriodLabel(parsePeriodText(periodKey), granularity),
      };
      messagesMap.set(periodKey, { ...base });
      conversationsMap.set(periodKey, { ...base });
    }

    messagesMap.get(periodKey)![row.salesperson_id] = row.messages;
    conversationsMap.get(periodKey)![row.salesperson_id] = row.conversations;
  }

  const sortPoints = (points: SalespersonTimeSeriesPoint[]) =>
    [...points].sort((a, b) => a.period.localeCompare(b.period));

  return {
    messages: sortPoints([...messagesMap.values()]),
    conversations: sortPoints([...conversationsMap.values()]),
  };
}

/**
 * Table columns: lifetime totals, current UTC+3 calendar month, and today in
 * UTC+3. Shared by the human and bot queries so the two can never drift, and
 * reused as the definition the chart's daily bucket must agree with.
 */
const TABLE_COLUMNS_SQL = `
  COUNT(*)::int AS total_messages,
  COUNT(DISTINCT lm.lead_uuid)::int AS total_conversations,
  COUNT(*) FILTER (
    WHERE ${currentMonthFilter("lm.created_at")}
  )::int AS this_month_messages,
  COUNT(DISTINCT lm.lead_uuid) FILTER (
    WHERE ${currentMonthFilter("lm.created_at")}
  )::int AS this_month_conversations,
  COUNT(*) FILTER (
    WHERE ${todayFilter("lm.created_at")}
  )::int AS today_messages,
  COUNT(DISTINCT lm.lead_uuid) FILTER (
    WHERE ${todayFilter("lm.created_at")}
  )::int AS today_conversations
`;

function mapTableRow(
  row: Record<string, unknown>,
  id: string,
  name: string,
): SalespersonPerformanceRow {
  return {
    id,
    name,
    totalMessages: row.total_messages as number,
    totalConversations: row.total_conversations as number,
    thisMonthMessages: row.this_month_messages as number,
    thisMonthConversations: row.this_month_conversations as number,
    todayMessages: row.today_messages as number,
    todayConversations: row.today_conversations as number,
  };
}

function sortPerformanceRows(
  rows: SalespersonPerformanceRow[],
): SalespersonPerformanceRow[] {
  return [...rows].sort((a, b) => {
    const byMessages = b.totalMessages - a.totalMessages;
    if (byMessages !== 0) return byMessages;
    return a.name.localeCompare(b.name, "tr");
  });
}

/**
 * Loads salesperson performance table and multi-series time chart data.
 */
export async function getCrmSalesAnalytics(
  filters: CrmDashboardFilters,
  granularity: Granularity,
  salespersonIds: string[],
): Promise<CrmSalesAnalyticsResponse> {
  const pool = getCrmPool();
  const humanChartWhere = await buildOutboundWhere(
    filters,
    ATTRIBUTED_AGENT_MESSAGE_FILTER,
    { includeDateRange: true },
  );
  const humanTableWhere = await buildOutboundWhere(
    filters,
    ATTRIBUTED_AGENT_MESSAGE_FILTER,
    { includeDateRange: false },
  );
  const botChartWhere = await buildOutboundWhere(
    filters,
    AUTOMATION_OUTBOUND_MESSAGE_FILTER,
    { includeDateRange: true },
  );
  const botTableWhere = await buildOutboundWhere(
    filters,
    AUTOMATION_OUTBOUND_MESSAGE_FILTER,
    { includeDateRange: false },
  );

  const humanOutboundFrom = `
    FROM lead_messages lm
    INNER JOIN leads l ON l.uuid = lm.lead_uuid
    LEFT JOIN lead_details ld ON ld.lead_uuid = l.uuid
    ${SALESPERSON_JOIN}
    ${humanTableWhere.sql}
  `;

  const humanChartFrom = `
    FROM lead_messages lm
    INNER JOIN leads l ON l.uuid = lm.lead_uuid
    LEFT JOIN lead_details ld ON ld.lead_uuid = l.uuid
    ${SALESPERSON_JOIN}
    ${humanChartWhere.sql}
  `;

  const botOutboundFrom = `
    FROM lead_messages lm
    INNER JOIN leads l ON l.uuid = lm.lead_uuid
    LEFT JOIN lead_details ld ON ld.lead_uuid = l.uuid
    ${botTableWhere.sql}
  `;

  const botChartFrom = `
    FROM lead_messages lm
    INNER JOIN leads l ON l.uuid = lm.lead_uuid
    LEFT JOIN lead_details ld ON ld.lead_uuid = l.uuid
    ${botChartWhere.sql}
  `;

  const unit = granularityUnit(granularity);

  const [humanTableRows, botTableRows, humanSeriesRows, botSeriesRows] =
    await Promise.all([
    pool.query(
      `SELECT
         ${AGENT_ID_SQL} AS id,
         ${AGENT_NAME_SQL} AS full_name,
         ${TABLE_COLUMNS_SQL}
       ${humanOutboundFrom}
       GROUP BY lm.sender_id`,
      humanTableWhere.params,
    ),
    pool.query(
      `SELECT ${TABLE_COLUMNS_SQL}
       ${botOutboundFrom}`,
      botTableWhere.params,
    ),
    pool.query(
      `SELECT
         ${localPeriodText(unit, "lm.created_at")} AS period,
         ${AGENT_ID_SQL} AS salesperson_id,
         COUNT(*)::int AS messages,
         COUNT(DISTINCT lm.lead_uuid)::int AS conversations
       ${humanChartFrom}
       GROUP BY 1, lm.sender_id
       ORDER BY 1 ASC, 2 ASC`,
      humanChartWhere.params,
    ),
    pool.query(
      `SELECT
         ${localPeriodText(unit, "lm.created_at")} AS period,
         COUNT(*)::int AS messages,
         COUNT(DISTINCT lm.lead_uuid)::int AS conversations
       ${botChartFrom}
       GROUP BY 1
       ORDER BY 1 ASC`,
      botChartWhere.params,
    ),
  ]);

  const humanTable: SalespersonPerformanceRow[] = humanTableRows.rows.map(
    (row) => mapTableRow(row, row.id as string, row.full_name as string),
  );

  const botTable =
    botTableRows.rows.length > 0
      ? mapTableRow(
          botTableRows.rows[0] as Record<string, unknown>,
          BOT_AGENT_ID,
          BOT_AGENT_NAME,
        )
      : null;

  const table = sortPerformanceRows(
    botTable ? [...humanTable, botTable] : humanTable,
  );

  const salespeople: FilterOption[] = table.map((row) => ({
    id: row.id,
    name: row.name,
  }));

  const availableIds = new Set(salespeople.map((item) => item.id));
  const selectedIds =
    salespersonIds.length > 0
      ? salespersonIds.filter((id) => availableIds.has(id))
      : [...availableIds];

  const selectedSet = new Set(
    selectedIds.length > 0 ? selectedIds : [...availableIds],
  );

  const { messages, conversations } = pivotTimeSeries(
    [
      ...humanSeriesRows.rows.map((row) => ({
        period: row.period as string,
        salesperson_id: row.salesperson_id as string,
        messages: row.messages as number,
        conversations: row.conversations as number,
      })),
      ...botSeriesRows.rows.map((row) => ({
        period: row.period as string,
        salesperson_id: BOT_AGENT_ID,
        messages: row.messages as number,
        conversations: row.conversations as number,
      })),
    ],
    granularity,
    selectedSet,
  );

  const seriesMeta: SalespersonSeriesMeta[] = table
    .filter((row) => selectedSet.has(row.id))
    .map((row) => ({ id: row.id, name: row.name }));

  return {
    salespeople,
    table,
    seriesMeta,
    messagesTimeSeries: messages,
    conversationsTimeSeries: conversations,
  };
}
