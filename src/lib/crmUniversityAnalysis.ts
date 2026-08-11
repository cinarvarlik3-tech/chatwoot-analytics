/**
 * Üniversite Analizi: per-university metrics for the 2026 live CRM.
 *
 * Counting rules, as specified by the client:
 *   leads    -> a lead is attributed to the school it named FIRST (mentions.is_first),
 *               so the column is a partition and sums to the matched-lead count.
 *   messages -> a lead's messages are counted under EVERY school it named, once per
 *               school regardless of how often it was named. Message columns therefore
 *               total above the corpus figure when leads name more than one school.
 *
 * Inbound/outbound come from lead_messages.direction. message_type is corrupt on ~2150
 * rows (agent sends carry message_type='incoming') and must never be used here.
 */

import { getCrmPool } from "./crmDb";
import type {
  UniversityAnalysisResponse,
  UniversityAnalysisRow,
} from "./types";
import { computeOnem, computeUyum, isExcludedSchool } from "./uyumScore";

const ROWS_SQL = `
WITH live AS (
  SELECT l.uuid, l.created_at, l.funnel_status, l.assigned_to
  FROM leads l
  WHERE l.is_deleted = false AND NOT uni_lead_is_excluded(l.uuid)
),
msg AS (
  SELECT m.lead_uuid,
         count(*) FILTER (WHERE m.direction = 'incoming')                 AS inbound,
         count(*) FILTER (WHERE m.direction = 'outgoing')                 AS outbound,
         count(*) FILTER (WHERE m.direction = 'outgoing'
                            AND COALESCE(m.is_automation, false))         AS automated,
         min(m.created_at) FILTER (WHERE m.direction = 'incoming')        AS first_in
  FROM lead_messages m
  WHERE m.is_private = false
  GROUP BY m.lead_uuid
),
-- minutes from the lead's first inbound message to the first agent reply after it
resp AS (
  SELECT g.lead_uuid,
         EXTRACT(epoch FROM (min(o.created_at) - g.first_in)) / 60.0 AS mins
  FROM msg g
  JOIN lead_messages o
    ON o.lead_uuid = g.lead_uuid AND o.direction = 'outgoing'
   AND o.is_private = false AND o.created_at > g.first_in
  WHERE g.first_in IS NOT NULL
  GROUP BY g.lead_uuid, g.first_in
),
-- funnel_status is ~95% 'yeni', so "ever left yeni" is the only progression signal
-- with enough spread to rank on
prog AS (
  SELECT DISTINCT lead_uuid FROM lead_stage_history WHERE to_status <> 'yeni'
),
-- Durable return behaviour: did the lead come back on a LATER DAY under its own
-- steam? Deliberately defined on calendar days and elapsed span, not on any
-- messaging-window rule -- a housing sale runs for weeks, so a metric coupled to a
-- 24h window would measure the platform rather than the customer.
inb AS (
  SELECT lead_uuid, created_at,
         min(created_at) OVER (PARTITION BY lead_uuid) AS t0
  FROM lead_messages
  WHERE direction = 'incoming' AND is_private = false
),
ret AS (
  SELECT lead_uuid,
         count(DISTINCT (created_at AT TIME ZONE 'Europe/Istanbul')::date) AS active_days,
         max(EXTRACT(epoch FROM (created_at - t0)) / 86400.0)              AS span_days,
         count(*) FILTER (WHERE created_at > t0 + interval '3 days')       AS after_3d
  FROM inb
  GROUP BY lead_uuid
),
base AS (
  SELECT c.id AS canonical_id, c.canonical_name, c.scope,
         count(*) FILTER (WHERE m.is_first)                    AS leads,
         count(*)                                              AS leads_mentioning,
         COALESCE(sum(g.inbound), 0)                           AS inbound,
         COALESCE(sum(g.outbound), 0)                          AS outbound,
         COALESCE(sum(g.automated), 0)                         AS automated,
         count(*) FILTER (WHERE g.inbound > 1)                 AS replied,
         count(*) FILTER (WHERE g.inbound >= 5)                AS deep,
         count(*) FILTER (WHERE COALESCE(rt.active_days, 0) >= 2) AS returned,
         count(*) FILTER (WHERE COALESCE(rt.after_3d, 0) > 0)  AS sustained,
         avg(rt.span_days)                                     AS avg_span_days,
         count(*) FILTER (WHERE p.lead_uuid IS NOT NULL)       AS progressed,
         count(*) FILTER (WHERE l.funnel_status = 'lost')      AS lost,
         count(*) FILTER (WHERE m.is_first
                            AND l.created_at > now() - interval '7 days')  AS leads_7d,
         count(*) FILTER (WHERE m.is_first
                            AND l.created_at > now() - interval '30 days') AS leads_30d,
         count(*) FILTER (WHERE m.is_first
                            AND l.created_at > now() - interval '14 days'
                            AND l.created_at <= now() - interval '7 days') AS leads_prev7d,
         percentile_cont(0.5) WITHIN GROUP (ORDER BY r.mins)   AS median_resp_min,
         min(m.first_seen_at)                                  AS first_mention_at,
         max(m.first_seen_at)                                  AS last_mention_at
  FROM lead_university_mentions m
  -- is_rankable excludes split parents kept only for lineage (İÜ-Cerrahpaşa)
  JOIN university_canonical c ON c.id = m.canonical_id AND c.is_rankable
  JOIN live l                 ON l.uuid = m.lead_uuid
  LEFT JOIN msg  g ON g.lead_uuid = l.uuid
  LEFT JOIN resp r ON r.lead_uuid = l.uuid
  LEFT JOIN ret  rt ON rt.lead_uuid = l.uuid
  LEFT JOIN prog p ON p.lead_uuid = l.uuid
  GROUP BY c.id, c.canonical_name, c.scope
),
glob AS (
  SELECT sum(leads)::numeric                                        AS all_leads,
         NULLIF(max(leads), 0)::numeric                             AS max_leads,
         NULLIF(max(leads_30d), 0)::numeric                         AS max_leads_30d,
         NULLIF(sum(deep)::numeric / NULLIF(sum(leads_mentioning), 0), 0)       AS g_deep,
         NULLIF(sum(returned)::numeric / NULLIF(sum(leads_mentioning), 0), 0)   AS g_ret,
         NULLIF(sum(progressed)::numeric / NULLIF(sum(leads_mentioning), 0), 0) AS g_prog
  FROM base
)
SELECT b.canonical_id, b.canonical_name, b.scope,
       b.leads, b.leads_mentioning,
       (b.inbound + b.outbound) AS messages, b.inbound, b.outbound,
       round((b.inbound + b.outbound)::numeric / NULLIF(b.leads_mentioning, 0), 2) AS msg_per_lead,
       round(b.inbound::numeric  / NULLIF(b.leads_mentioning, 0), 2) AS inbound_per_lead,
       round(b.outbound::numeric / NULLIF(b.leads_mentioning, 0), 2) AS outbound_per_lead,
       round(100 * b.leads::numeric / NULLIF(g.all_leads, 0), 2)     AS lead_share,
       b.deep AS engaged_leads,
       round(100 * b.replied::numeric   / NULLIF(b.leads_mentioning, 0), 1) AS reply_rate,
       round(100 * b.deep::numeric      / NULLIF(b.leads_mentioning, 0), 1) AS deep_rate,
       b.returned,
       round(100 * b.returned::numeric  / NULLIF(b.leads_mentioning, 0), 1) AS return_rate,
       round(100 * b.sustained::numeric / NULLIF(b.leads_mentioning, 0), 1) AS sustained_rate,
       round(b.avg_span_days::numeric, 2)                            AS avg_span_days,
       round(100 * b.automated::numeric / NULLIF(b.outbound, 0), 1)  AS automation_share,
       round(b.median_resp_min::numeric, 1)                          AS median_resp_min,
       b.progressed,
       round(100 * b.progressed::numeric / NULLIF(b.leads_mentioning, 0), 1) AS progression_rate,
       b.lost,
       round(100 * b.lost::numeric / NULLIF(b.leads_mentioning, 0), 1)       AS loss_rate,
       b.leads_7d, b.leads_30d,
       CASE WHEN b.leads_prev7d > 0
            THEN round(b.leads_7d::numeric / b.leads_prev7d, 2) END  AS growth_rate,
       b.first_mention_at, b.last_mention_at,
       -- Importance score, 0-100. There is no revenue anywhere in this database, so it
       -- blends scale (35), current momentum (20), conversation depth (20), durable
       -- return behaviour (15) and funnel progression (10).
       --
       -- Momentum is weighted below scale on purpose: leads_30d is a SUBSET of leads
       -- and the two correlate at r=0.98, so every point given to momentum is mostly a
       -- second vote for size. Return rate is the term that carries information scale
       -- does not -- whether a school's students come back on a later day by
       -- themselves, which is what a weeks-long housing sale actually depends on.
       --
       -- All three rate terms are shrunk toward the global mean (k=25) and clamped to
       -- 2x it, so a university with 18 leads and one lucky run cannot outrank one
       -- with 300.
       round(100 * (
           0.35 * (b.leads::numeric / NULLIF(g.max_leads, 0))
         + 0.20 * (b.leads_30d::numeric / NULLIF(g.max_leads_30d, 0))
         + 0.20 * LEAST(((b.deep + 25 * g.g_deep) / (b.leads_mentioning + 25))
                        / g.g_deep, 2.0) / 2.0
         + 0.15 * LEAST(((b.returned + 25 * g.g_ret) / (b.leads_mentioning + 25))
                        / g.g_ret, 2.0) / 2.0
         + 0.10 * LEAST(((b.progressed + 25 * g.g_prog) / (b.leads_mentioning + 25))
                        / g.g_prog, 2.0) / 2.0
       ), 1) AS importance_score
FROM base b CROSS JOIN glob g
ORDER BY importance_score DESC NULLS LAST, b.leads DESC`;

const MANUAL_SCORES_SQL = `SELECT canonical_id, score FROM university_manual_scores`;

const TOTALS_SQL = `
WITH live AS (
  SELECT l.uuid FROM leads l
  WHERE l.is_deleted = false AND NOT uni_lead_is_excluded(l.uuid)
)
SELECT (SELECT count(*) FROM live)                                          AS leads,
       (SELECT count(DISTINCT m.lead_uuid) FROM lead_university_mentions m
         JOIN live l ON l.uuid = m.lead_uuid)                               AS matched_leads,
       (SELECT count(*) FROM lead_messages m JOIN live l ON l.uuid = m.lead_uuid
         WHERE m.is_private = false AND m.direction = 'incoming')           AS inbound,
       (SELECT count(*) FROM lead_messages m JOIN live l ON l.uuid = m.lead_uuid
         WHERE m.is_private = false AND m.direction = 'outgoing')           AS outbound,
       (SELECT last_run_at FROM university_parse_state WHERE id = 1)        AS last_parsed_at`;

const num = (v: unknown): number => (v === null || v === undefined ? 0 : Number(v));
const numOrNull = (v: unknown): number | null =>
  v === null || v === undefined ? null : Number(v);
const iso = (v: unknown): string | null =>
  v instanceof Date ? v.toISOString() : v === null || v === undefined ? null : String(v);

/** Loads every university with its metrics, ranked by importance score. */
export async function getUniversityAnalysis(): Promise<UniversityAnalysisResponse> {
  const pool = getCrmPool();
  const [rowsRes, totalsRes, manualRes] = await Promise.all([
    pool.query(ROWS_SQL),
    pool.query(TOTALS_SQL),
    pool.query(MANUAL_SCORES_SQL),
  ]);
  const manualByCanonicalId = new Map<string, number>(
    manualRes.rows.map((r) => [String(r.canonical_id), Number(r.score)]),
  );

  // Uyum comes from committed geo/price/quality data, not the database.
  const uyumByName = computeUyum();
  const getiriValues = [...uyumByName.values()].map((u) => u.getiri);
  const getiriAvg = getiriValues.length
    ? getiriValues.reduce((a, b) => a + b, 0) / getiriValues.length
    : 1;

  const rows: UniversityAnalysisRow[] = rowsRes.rows.map((r) => ({
    canonicalId: String(r.canonical_id),
    name: String(r.canonical_name),
    scope: r.scope === "istanbul" ? "istanbul" : "outside-istanbul",
    leads: num(r.leads),
    leadsMentioning: num(r.leads_mentioning),
    messages: num(r.messages),
    inboundMessages: num(r.inbound),
    outboundMessages: num(r.outbound),
    messagesPerLead: num(r.msg_per_lead),
    inboundPerLead: num(r.inbound_per_lead),
    outboundPerLead: num(r.outbound_per_lead),
    leadShare: num(r.lead_share),
    engagedLeads: num(r.engaged_leads),
    engagementRate: num(r.deep_rate),
    returnedLeads: num(r.returned),
    returnRate: num(r.return_rate),
    sustainedRate: num(r.sustained_rate),
    avgSpanDays: numOrNull(r.avg_span_days),
    oneAndDoneRate: Math.max(0, Math.round((100 - num(r.reply_rate)) * 10) / 10),
    automationShare: num(r.automation_share),
    medianFirstResponseMin: numOrNull(r.median_resp_min),
    progressedLeads: num(r.progressed),
    progressionRate: num(r.progression_rate),
    lostLeads: num(r.lost),
    lossRate: num(r.loss_rate),
    avgLeadScore: null, // leads.lead_score is 0 for every row; column carries no signal
    leads7d: num(r.leads_7d),
    leads30d: num(r.leads_30d),
    growthRate: numOrNull(r.growth_rate),
    firstMentionAt: iso(r.first_mention_at),
    lastMentionAt: iso(r.last_mention_at),
    importanceScore: num(r.importance_score),
    manuelSkor: manualByCanonicalId.get(String(r.canonical_id)) ?? null,
    // filled in below, once Uyum is joined
    ilgiScore: 0, uyumScore: 0, uyumFemale: 0, uyumMale: 0,
    getiri: 1, onemScore: 0, fark: 0,
  }));

  for (const row of rows) {
    const u = uyumByName.get(row.name);
    row.ilgiScore = Math.round((row.importanceScore / 10) * 10) / 10;
    row.uyumScore = u ? Math.round(u.uyum * 10) / 10 : 0;
    row.uyumFemale = u ? Math.round(u.uyumFemale * 10) / 10 : 0;
    row.uyumMale = u ? Math.round(u.uyumMale * 10) / 10 : 0;
    row.getiri = u ? Math.round(u.getiri * 100) / 100 : 1;
    row.onemScore =
      Math.round(computeOnem(row.ilgiScore, row.uyumScore, row.getiri, getiriAvg) * 10) / 10;
    row.fark = Math.round((row.ilgiScore - row.uyumScore) * 10) / 10;
  }

  // MYOs never rank.
  const ranked = rows
    .filter((r) => !isExcludedSchool(r.name))
    .sort((a, b) => b.onemScore - a.onemScore || b.leads - a.leads);

  const t = totalsRes.rows[0] ?? {};
  const leads = num(t.leads);
  const matchedLeads = num(t.matched_leads);

  return {
    rows: ranked,
    totals: {
      leads,
      matchedLeads,
      unmatchedLeads: Math.max(0, leads - matchedLeads),
      messages: num(t.inbound) + num(t.outbound),
      inboundMessages: num(t.inbound),
      outboundMessages: num(t.outbound),
      universities: ranked.filter((r) => r.leadsMentioning > 0).length,
    },
    generatedAt: new Date().toISOString(),
    lastParsedAt: iso(t.last_parsed_at),
  };
}

const UPSERT_MANUAL_SCORE_SQL = `
  INSERT INTO university_manual_scores (canonical_id, score, updated_at)
  VALUES ($1, $2, now())
  ON CONFLICT (canonical_id) DO UPDATE SET score = EXCLUDED.score, updated_at = now()`;

const DELETE_MANUAL_SCORE_SQL = `DELETE FROM university_manual_scores WHERE canonical_id = $1`;

/**
 * Persists (or clears, when score is null) the Manuel Skor for one university.
 * Postgres integer is int4, so anything outside that range is rejected by the
 * driver/column itself rather than needing an explicit range check here.
 */
export async function setManualScore(canonicalId: string, score: number | null): Promise<void> {
  const pool = getCrmPool();
  if (score === null) {
    await pool.query(DELETE_MANUAL_SCORE_SQL, [canonicalId]);
    return;
  }
  if (!Number.isInteger(score)) {
    throw new Error("Manuel Skor bir tam sayı olmalıdır");
  }
  await pool.query(UPSERT_MANUAL_SCORE_SQL, [canonicalId, score]);
}
