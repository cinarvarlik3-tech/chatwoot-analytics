/**
 * CRM (2026 live) message-template usage counts, for the template pie chart.
 */
import { buildMessageWhere } from "./crmAnalytics";
import { getCrmPool } from "./crmDb";
import { ALL_OUTBOUND_MESSAGE_FILTER } from "./crmMessageFilters";
import { MESSAGE_TEMPLATES } from "./messageTemplates";
import { matchTemplates } from "./templateMatcher";
import type { BreakdownPoint, CrmDashboardFilters } from "./types";

const LABELS = new Map(MESSAGE_TEMPLATES.map((t) => [t.shortCode, t.label]));

export async function getCrmTemplateUsage(
  filters: CrmDashboardFilters,
): Promise<BreakdownPoint[]> {
  const pool = getCrmPool();
  const where = await buildMessageWhere(filters, ALL_OUTBOUND_MESSAGE_FILTER);

  const { rows } = await pool.query<{ content: string | null }>(
    `SELECT lm.content
     FROM lead_messages lm
     INNER JOIN leads l ON l.uuid = lm.lead_uuid
     LEFT JOIN lead_details ld ON ld.lead_uuid = l.uuid
     ${where.sql}`,
    where.params,
  );

  const counts = new Map<string, number>();
  for (const row of rows) {
    for (const shortCode of matchTemplates(row.content)) {
      counts.set(shortCode, (counts.get(shortCode) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([key, value]) => ({ key, name: LABELS.get(key) ?? key, value }))
    .sort((a, b) => b.value - a.value);
}
