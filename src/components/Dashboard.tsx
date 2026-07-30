"use client";

/**
 * Main Chatwoot analytics dashboard with message and lead metrics.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3, Filter } from "lucide-react";
import { BreakdownPieChart } from "@/components/BreakdownPieChart";
import { FilterModal } from "@/components/FilterModal";
import { SchoolBreakdownTable } from "@/components/SchoolBreakdownTable";
import { StatCards } from "@/components/StatCards";
import { TimeSeriesChart } from "@/components/TimeSeriesChart";
import type {
  AnalyticsResponse,
  DashboardFilters,
  FilterOptionsResponse,
  Granularity,
  MetricMode,
} from "@/lib/types";

const defaultFilters: DashboardFilters = {
  startDate: null,
  endDate: null,
  universities: [],
  channelIds: [],
};

function buildQuery(
  filters: DashboardFilters,
  granularity: Granularity,
): string {
  const params = new URLSearchParams();
  params.set("granularity", granularity);
  if (filters.startDate) params.set("startDate", filters.startDate);
  if (filters.endDate) params.set("endDate", filters.endDate);
  filters.universities.forEach((name) => params.append("university", name));
  filters.channelIds.forEach((id) => params.append("channelId", String(id)));
  return params.toString();
}

function activeFilterCount(filters: DashboardFilters): number {
  let count = 0;
  if (filters.startDate) count += 1;
  if (filters.endDate) count += 1;
  if (filters.universities.length > 0) count += 1;
  if (filters.channelIds.length > 0) count += 1;
  return count;
}

function resolveUniversityNames(
  ids: string[],
  options: FilterOptionsResponse | null,
): string[] {
  if (!options) return ids;
  const lookup = new Map(options.universities.map((item) => [item.id, item.name]));
  return ids.map((id) => lookup.get(id) ?? id);
}

function resolveChannelNames(
  ids: number[],
  options: FilterOptionsResponse | null,
): string[] {
  if (!options) return ids.map(String);
  const lookup = new Map(options.channels.map((item) => [item.id, item.name]));
  return ids.map((id) => lookup.get(id) ?? String(id));
}

interface ActiveFilterChipsProps {
  filters: DashboardFilters;
  options: FilterOptionsResponse | null;
  onChange: (filters: DashboardFilters) => void;
}

function ActiveFilterChips({
  filters,
  options,
  onChange,
}: ActiveFilterChipsProps) {
  const hasFilters =
    filters.universities.length > 0 ||
    filters.channelIds.length > 0 ||
    filters.startDate ||
    filters.endDate;

  if (!hasFilters) return null;

  const chips: { key: string; label: string; onRemove: () => void }[] = [];

  if (filters.startDate) {
    chips.push({
      key: "start",
      label: `Başlangıç: ${filters.startDate}`,
      onRemove: () => onChange({ ...filters, startDate: null }),
    });
  }
  if (filters.endDate) {
    chips.push({
      key: "end",
      label: `Bitiş: ${filters.endDate}`,
      onRemove: () => onChange({ ...filters, endDate: null }),
    });
  }

  resolveUniversityNames(filters.universities, options).forEach((name, index) => {
    const id = filters.universities[index];
    chips.push({
      key: `uni-${id}`,
      label: name,
      onRemove: () =>
        onChange({
          ...filters,
          universities: filters.universities.filter((item) => item !== id),
        }),
    });
  });

  resolveChannelNames(filters.channelIds, options).forEach((name, index) => {
    const id = filters.channelIds[index];
    chips.push({
      key: `ch-${id}`,
      label: name,
      onRemove: () =>
        onChange({
          ...filters,
          channelIds: filters.channelIds.filter((item) => item !== id),
        }),
    });
  });

  return (
    <div className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-3 sm:px-6 lg:px-8">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Aktif filtreler
        </span>
        {chips.map((chip) => (
          <span
            key={chip.key}
            className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-800"
          >
            {chip.label}
            <button
              type="button"
              onClick={chip.onRemove}
              className="rounded-full p-0.5 hover:bg-violet-100"
              aria-label={`${chip.label} filtresini kaldır`}
            >
              ×
            </button>
          </span>
        ))}
        <button
          type="button"
          onClick={() => onChange(defaultFilters)}
          className="text-xs font-medium text-slate-500 hover:text-slate-800"
        >
          Tümünü temizle
        </button>
      </div>
    </div>
  );
}

export function Dashboard() {
  const [filters, setFilters] = useState<DashboardFilters>(defaultFilters);
  const [filterOptions, setFilterOptions] =
    useState<FilterOptionsResponse | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [granularity, setGranularity] = useState<Granularity>("monthly");
  const [metric, setMetric] = useState<MetricMode>("messages");
  const [filterOpen, setFilterOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/filters")
      .then((res) => {
        if (!res.ok) throw new Error("Filtreler alınamadı");
        return res.json();
      })
      .then(setFilterOptions)
      .catch(() => setError("Filtre seçenekleri yüklenemedi"));
  }, []);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/analytics?${buildQuery(filters, granularity)}`,
      );
      if (!res.ok) throw new Error("Analitik veriler alınamadı");
      const data: AnalyticsResponse = await res.json();
      setAnalytics(data);
    } catch {
      setError("Veriler yüklenirken bir hata oluştu");
    } finally {
      setLoading(false);
    }
  }, [filters, granularity]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const filterBadge = useMemo(() => activeFilterCount(filters), [filters]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-violet-600 p-2.5 text-white">
              <BarChart3 className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">
                Chatwoot Analitiği
              </h1>
              <p className="text-sm text-slate-500">
                Univotel mesaj ve lead istatistikleri
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setFilterOpen(true)}
            className="relative inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <Filter className="h-4 w-4" aria-hidden />
            Filtrele
            {filterBadge > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-violet-600 px-1 text-xs font-semibold text-white">
                {filterBadge}
              </span>
            )}
          </button>
        </div>
      </header>

      <ActiveFilterChips
        filters={filters}
        options={filterOptions}
        onChange={setFilters}
      />

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 lg:px-8">
        {error && (
          <div
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            role="alert"
          >
            {error}
          </div>
        )}

        <StatCards
          messages={analytics?.totals.messages ?? 0}
          leads={analytics?.totals.leads ?? 0}
          loading={loading && !analytics}
        />

        <TimeSeriesChart
          title="Zaman İçinde"
          messagesData={analytics?.messages.timeSeries ?? []}
          leadsData={analytics?.leads.timeSeries ?? []}
          metric={metric}
          onMetricChange={setMetric}
          granularity={granularity}
          onGranularityChange={setGranularity}
          loading={loading}
        />

        <div className="grid gap-6 xl:grid-cols-2">
          <BreakdownPieChart
            title="Okula Göre"
            messagesData={analytics?.messages.bySchool ?? []}
            leadsData={analytics?.leads.bySchool ?? []}
            metric={metric}
            onMetricChange={setMetric}
            breakdownLabel="school"
            loading={loading}
            maxSlices={10}
          />
          <BreakdownPieChart
            title="Kanala Göre"
            messagesData={analytics?.messages.byChannel ?? []}
            leadsData={analytics?.leads.byChannel ?? []}
            metric={metric}
            onMetricChange={setMetric}
            breakdownLabel="channel"
            loading={loading}
            maxSlices={6}
          />
        </div>

        <SchoolBreakdownTable
          data={analytics?.bySchoolTable ?? []}
          loading={loading}
        />
      </main>

      <FilterModal
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        options={filterOptions}
        filters={filters}
        onApply={setFilters}
      />
    </div>
  );
}
