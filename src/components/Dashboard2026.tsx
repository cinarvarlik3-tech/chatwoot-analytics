"use client";

/**
 * Live CRM analytics dashboard (2026).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3, Bot, Filter, Send } from "lucide-react";
import { BreakdownPieChart } from "@/components/BreakdownPieChart";
import { CrmFilterModal } from "@/components/CrmFilterModal";
import { SalespersonPerformanceTable } from "@/components/SalespersonPerformanceTable";
import { SalespersonTimeSeriesChart } from "@/components/SalespersonTimeSeriesChart";
import { SchoolBreakdownTable } from "@/components/SchoolBreakdownTable";
import { StatCards } from "@/components/StatCards";
import { TemplateUsagePieChart } from "@/components/TemplateUsagePieChart";
import { TimeSeriesChart } from "@/components/TimeSeriesChart";
import type {
  BreakdownPoint,
  CrmAnalyticsResponse,
  CrmDashboardFilters,
  CrmFilterOptionsResponse,
  CrmSalesAnalyticsResponse,
  CrmTemplateUsageResponse,
  Granularity,
  MetricMode,
} from "@/lib/types";
import {
  dashboardFilterChipsClass,
  dashboardHeaderClass,
  dashboardMainClass,
} from "@/lib/dashboardLayout";

const defaultFilters: CrmDashboardFilters = {
  startDate: null,
  endDate: null,
  parentUniversities: [],
};

function buildQuery(
  filters: CrmDashboardFilters,
  granularity: Granularity,
  salespersonIds: string[] = [],
): string {
  const params = new URLSearchParams();
  params.set("granularity", granularity);
  if (filters.startDate) params.set("startDate", filters.startDate);
  if (filters.endDate) params.set("endDate", filters.endDate);
  filters.parentUniversities.forEach((name) =>
    params.append("parentUniversity", name),
  );
  salespersonIds.forEach((id) => params.append("salespersonId", id));
  return params.toString();
}

function buildFilterQuery(filters: CrmDashboardFilters): string {
  const params = new URLSearchParams();
  if (filters.startDate) params.set("startDate", filters.startDate);
  if (filters.endDate) params.set("endDate", filters.endDate);
  filters.parentUniversities.forEach((name) =>
    params.append("parentUniversity", name),
  );
  return params.toString();
}

function activeFilterCount(filters: CrmDashboardFilters): number {
  let count = 0;
  if (filters.startDate) count += 1;
  if (filters.endDate) count += 1;
  if (filters.parentUniversities.length > 0) count += 1;
  return count;
}

function resolveParentNames(
  ids: string[],
  options: CrmFilterOptionsResponse | null,
): string[] {
  if (!options) return ids;
  const lookup = new Map(
    options.parentUniversities.map((item) => [item.id, item.name]),
  );
  return ids.map((id) => lookup.get(id) ?? id);
}

interface ActiveFilterChipsProps {
  filters: CrmDashboardFilters;
  options: CrmFilterOptionsResponse | null;
  onChange: (filters: CrmDashboardFilters) => void;
}

function ActiveFilterChips({
  filters,
  options,
  onChange,
}: ActiveFilterChipsProps) {
  const hasFilters =
    filters.parentUniversities.length > 0 ||
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

  resolveParentNames(filters.parentUniversities, options).forEach(
    (name, index) => {
      const id = filters.parentUniversities[index];
      chips.push({
        key: `parent-${id}`,
        label: name,
        onRemove: () =>
          onChange({
            ...filters,
            parentUniversities: filters.parentUniversities.filter(
              (item) => item !== id,
            ),
          }),
      });
    },
  );

  return (
    <div className={`border-b border-slate-200 bg-white ${dashboardFilterChipsClass}`}>
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
  );
}

export function Dashboard2026() {
  const [filters, setFilters] = useState<CrmDashboardFilters>(defaultFilters);
  const [filterOptions, setFilterOptions] =
    useState<CrmFilterOptionsResponse | null>(null);
  const [analytics, setAnalytics] = useState<CrmAnalyticsResponse | null>(null);
  const [salesAnalytics, setSalesAnalytics] =
    useState<CrmSalesAnalyticsResponse | null>(null);
  const [selectedSalespeople, setSelectedSalespeople] = useState<string[]>([]);
  const [salesMetric, setSalesMetric] = useState<MetricMode>("messages");
  const [granularity, setGranularity] = useState<Granularity>("monthly");
  const [salesGranularity, setSalesGranularity] =
    useState<Granularity>("weekly");
  const [metric, setMetric] = useState<MetricMode>("messages");
  const [templateUsage, setTemplateUsage] = useState<BreakdownPoint[]>([]);
  const [templateUsageLoading, setTemplateUsageLoading] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [salesLoading, setSalesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const displaySelectedSalespeople = useMemo(() => {
    if (selectedSalespeople.length > 0) return selectedSalespeople;
    return salesAnalytics?.salespeople.map((item) => item.id) ?? [];
  }, [selectedSalespeople, salesAnalytics]);

  useEffect(() => {
    fetch("/api/crm/filters")
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
        `/api/crm/analytics?${buildQuery(filters, granularity)}`,
      );
      if (!res.ok) throw new Error("Analitik veriler alınamadı");
      const data: CrmAnalyticsResponse = await res.json();
      setAnalytics(data);
    } catch {
      setError("Veriler yüklenirken bir hata oluştu");
    } finally {
      setLoading(false);
    }
  }, [filters, granularity]);

  const loadSalesAnalytics = useCallback(async () => {
    setSalesLoading(true);
    try {
      const res = await fetch(
        `/api/crm/sales-analytics?${buildQuery(
          filters,
          salesGranularity,
          selectedSalespeople,
        )}`,
      );
      if (!res.ok) throw new Error("Satışçı verileri alınamadı");
      const data: CrmSalesAnalyticsResponse = await res.json();
      setSalesAnalytics(data);
    } catch {
      setError("Satışçı verileri yüklenirken bir hata oluştu");
    } finally {
      setSalesLoading(false);
    }
  }, [filters, salesGranularity, selectedSalespeople]);

  const loadTemplateUsage = useCallback(async () => {
    setTemplateUsageLoading(true);
    try {
      const res = await fetch(
        `/api/crm/template-usage?${buildFilterQuery(filters)}`,
      );
      if (!res.ok) throw new Error("Şablon kullanım verileri alınamadı");
      const data: CrmTemplateUsageResponse = await res.json();
      setTemplateUsage(data.items);
    } catch {
      setError("Şablon kullanım verileri yüklenirken bir hata oluştu");
    } finally {
      setTemplateUsageLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  useEffect(() => {
    loadSalesAnalytics();
  }, [loadSalesAnalytics]);

  useEffect(() => {
    loadTemplateUsage();
  }, [loadTemplateUsage]);

  const filterBadge = useMemo(() => activeFilterCount(filters), [filters]);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className={dashboardHeaderClass}>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-600 p-2.5 text-white">
              <BarChart3 className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">
                CRM Analitiği
              </h1>
              <p className="text-sm text-slate-500">
                Canlı lead ve mesaj verileri — 2026
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

      <main className={dashboardMainClass}>
        {error && (
          <div
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            role="alert"
          >
            {error}
          </div>
        )}

        <StatCards
          primaryLabel="Gelen Mesaj"
          primaryValue={analytics?.totals.incomingMessages ?? 0}
          secondaryLabel="Benzersiz Telefon"
          secondarySubtitle="Lead sayısı"
          secondaryValue={analytics?.totals.uniquePhones ?? 0}
          tertiaryLabel="Otomasyon Mesajı"
          tertiarySubtitle="Bot / kural yanıtları"
          tertiaryValue={analytics?.totals.automationMessages ?? 0}
          tertiaryIcon={Bot}
          quaternaryLabel="Lead Başına İnsan Mesajı"
          quaternarySubtitle="Bot hariç giden mesaj / lead"
          quaternaryValue={analytics?.totals.humanOutgoingPerLead ?? 0}
          quaternaryDecimals={2}
          quaternaryIcon={Send}
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
          messageMetricLabel="Gelen Mesaj"
          leadMetricLabel="Telefon"
        />

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

        <SchoolBreakdownTable
          data={analytics?.bySchoolTable ?? []}
          loading={loading}
          entityLabel="Üniversite"
        />

        <TemplateUsagePieChart
          data={templateUsage}
          loading={templateUsageLoading}
        />

        <SalespersonPerformanceTable
          data={salesAnalytics?.table ?? []}
          loading={salesLoading && !salesAnalytics}
          metric={salesMetric}
          onMetricChange={setSalesMetric}
        />

        <SalespersonTimeSeriesChart
          title="Zaman İçinde Agent Performansı"
          messagesData={salesAnalytics?.messagesTimeSeries ?? []}
          conversationsData={salesAnalytics?.conversationsTimeSeries ?? []}
          seriesMeta={salesAnalytics?.seriesMeta ?? []}
          salespeopleOptions={salesAnalytics?.salespeople ?? []}
          selectedSalespeople={displaySelectedSalespeople}
          onSelectedSalespeopleChange={setSelectedSalespeople}
          metric={salesMetric}
          onMetricChange={setSalesMetric}
          granularity={salesGranularity}
          onGranularityChange={setSalesGranularity}
          loading={salesLoading}
        />
      </main>

      <CrmFilterModal
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        options={filterOptions}
        filters={filters}
        onApply={setFilters}
      />
    </>
  );
}
