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
