/**
 * Shared types for the Chatwoot analytics dashboard.
 */

export type Granularity = "daily" | "weekly" | "monthly" | "yearly";

export type MetricMode = "messages" | "leads";

/** Sentinel value for conversations/contacts without a parsed university. */
export const UNPARSED_UNIVERSITY = "__UNPARSED__";

export interface DashboardFilters {
  startDate: string | null;
  endDate: string | null;
  universities: string[];
  channelIds: number[];
}

export interface FilterOption {
  id: string;
  name: string;
}

export interface ChannelOption {
  id: number;
  name: string;
}

export interface FilterOptionsResponse {
  universities: FilterOption[];
  channels: ChannelOption[];
  dateRange: {
    min: string;
    max: string;
  };
}

export interface TimeSeriesPoint {
  period: string;
  label: string;
  value: number;
}

export interface BreakdownPoint {
  key: string;
  name: string;
  value: number;
}

export interface MetricBundle {
  timeSeries: TimeSeriesPoint[];
  bySchool: BreakdownPoint[];
  byChannel: BreakdownPoint[];
}

export interface SchoolTableRow {
  key: string;
  name: string;
  messages: number;
  leads: number;
}

export interface AnalyticsResponse {
  totals: {
    messages: number;
    leads: number;
  };
  messages: MetricBundle;
  leads: MetricBundle;
  bySchoolTable: SchoolTableRow[];
}

export interface CrmDashboardFilters {
  startDate: string | null;
  endDate: string | null;
  parentUniversities: string[];
}

export interface CrmFilterOptionsResponse {
  parentUniversities: FilterOption[];
  dateRange: {
    min: string;
    max: string;
  };
}

export interface CrmMetricBundle {
  timeSeries: TimeSeriesPoint[];
  bySchool: BreakdownPoint[];
}

export interface CrmTemplateUsageResponse {
  items: BreakdownPoint[];
}

export interface CrmAnalyticsResponse {
  totals: {
    incomingMessages: number;
    uniquePhones: number;
    automationMessages: number;
    /** Outgoing messages excluding bot/automation rows. */
    humanOutgoingMessages: number;
    /** humanOutgoingMessages / uniquePhones (0 when there are no leads). */
    humanOutgoingPerLead: number;
  };
  messages: CrmMetricBundle;
  leads: CrmMetricBundle;
  bySchoolTable: SchoolTableRow[];
}

/** Counts are lifetime / current UTC+3 month / today in UTC+3, never date-filtered. */
export interface SalespersonPerformanceRow {
  id: string;
  name: string;
  totalMessages: number;
  totalConversations: number;
  thisMonthMessages: number;
  thisMonthConversations: number;
  todayMessages: number;
  todayConversations: number;
}

export interface SalespersonSeriesMeta {
  id: string;
  name: string;
}

export interface SalespersonTimeSeriesPoint {
  period: string;
  label: string;
  [seriesKey: string]: string | number;
}

export interface CrmSalesAnalyticsResponse {
  salespeople: FilterOption[];
  table: SalespersonPerformanceRow[];
  seriesMeta: SalespersonSeriesMeta[];
  messagesTimeSeries: SalespersonTimeSeriesPoint[];
  conversationsTimeSeries: SalespersonTimeSeriesPoint[];
}

export type DashboardYear = "2025" | "2026";

/**
 * Navigation target. "2026-university" is a sub-view of the 2026 live CRM.
 */
export type DashboardView = "2025" | "2026" | "2026-university";

/** Year a view belongs to, for nav highlighting. */
export function viewYear(view: DashboardView): DashboardYear {
  return view === "2025" ? "2025" : "2026";
}

/**
 * One university in the Üniversite Analizi table. Counting rules:
 * - `leads` attributes a lead to the school it named FIRST, so the column is a
 *   partition and sums to the number of matched leads.
 * - message columns count a lead's messages under EVERY school it named, so they
 *   total above the corpus figure when leads name more than one school.
 */
export interface UniversityAnalysisRow {
  canonicalId: string;
  name: string;
  scope: "istanbul" | "outside-istanbul";
  leads: number;
  leadsMentioning: number;
  messages: number;
  inboundMessages: number;
  outboundMessages: number;
  messagesPerLead: number;
  inboundPerLead: number;
  outboundPerLead: number;
  leadShare: number;
  engagedLeads: number;
  engagementRate: number;
  returnedLeads: number;
  returnRate: number;
  sustainedRate: number;
  avgSpanDays: number | null;
  oneAndDoneRate: number;
  automationShare: number;
  medianFirstResponseMin: number | null;
  progressedLeads: number;
  progressionRate: number;
  lostLeads: number;
  lossRate: number;
  avgLeadScore: number | null;
  leads7d: number;
  leads30d: number;
  growthRate: number | null;
  firstMentionAt: string | null;
  lastMentionAt: string | null;
  /** 0-10 demand score (was importanceScore/10). */
  ilgiScore: number;
  /** 0-10 supply-fit score. */
  uyumScore: number;
  uyumFemale: number;
  uyumMale: number;
  /** Yield factor: margin of the properties serving this school. */
  getiri: number;
  /** 0-10 combined business importance. */
  onemScore: number;
  /** İlgi - Uyum. Positive = demand we cannot serve. */
  fark: number;
  importanceScore: number;
}

export interface UniversityAnalysisResponse {
  rows: UniversityAnalysisRow[];
  totals: {
    leads: number;
    matchedLeads: number;
    unmatchedLeads: number;
    messages: number;
    inboundMessages: number;
    outboundMessages: number;
    universities: number;
  };
  generatedAt: string;
  lastParsedAt: string | null;
}
