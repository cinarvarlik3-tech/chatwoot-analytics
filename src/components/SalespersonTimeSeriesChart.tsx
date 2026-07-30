"use client";

/**
 * Multi-series line chart for salesperson outbound performance over time.
 */

import { useMemo } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MetricToggle } from "@/components/MetricToggle";
import { SearchableSelect } from "@/components/SearchableSelect";
import type {
  FilterOption,
  Granularity,
  MetricMode,
  SalespersonSeriesMeta,
  SalespersonTimeSeriesPoint,
} from "@/lib/types";

interface SalespersonTimeSeriesChartProps {
  title: string;
  messagesData: SalespersonTimeSeriesPoint[];
  conversationsData: SalespersonTimeSeriesPoint[];
  seriesMeta: SalespersonSeriesMeta[];
  salespeopleOptions: FilterOption[];
  selectedSalespeople: string[];
  onSelectedSalespeopleChange: (ids: string[]) => void;
  metric: MetricMode;
  onMetricChange: (metric: MetricMode) => void;
  granularity: Granularity;
  onGranularityChange: (granularity: Granularity) => void;
  loading?: boolean;
}

const GRANULARITY_OPTIONS: { value: Granularity; label: string }[] = [
  { value: "yearly", label: "Yıllık" },
  { value: "monthly", label: "Aylık" },
  { value: "weekly", label: "Haftalık" },
  { value: "daily", label: "Günlük" },
];

const LINE_COLORS = [
  "#7c3aed",
  "#059669",
  "#2563eb",
  "#d97706",
  "#dc2626",
  "#0891b2",
  "#9333ea",
  "#ca8a04",
  "#db2777",
  "#4f46e5",
];

function handleSalespeopleChange(
  next: string[],
  allIds: string[],
  onChange: (ids: string[]) => void,
): void {
  if (next.length === 0 && allIds.length > 0) {
    onChange([allIds[0]]);
    return;
  }
  onChange(next);
}

export function SalespersonTimeSeriesChart({
  title,
  messagesData,
  conversationsData,
  seriesMeta,
  salespeopleOptions,
  selectedSalespeople,
  onSelectedSalespeopleChange,
  metric,
  onMetricChange,
  granularity,
  onGranularityChange,
  loading,
}: SalespersonTimeSeriesChartProps) {
  const data = metric === "messages" ? messagesData : conversationsData;
  const metricLabel = metric === "messages" ? "Mesaj" : "Konuşma";

  const colorById = useMemo(() => {
    const map = new Map<string, string>();
    seriesMeta.forEach((item, index) => {
      map.set(item.id, LINE_COLORS[index % LINE_COLORS.length]);
    });
    return map;
  }, [seriesMeta]);

  const allIds = useMemo(
    () => salespeopleOptions.map((item) => item.id),
    [salespeopleOptions],
  );

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <p className="text-sm text-slate-500">
            Seçilen satışçıların giden {metricLabel.toLowerCase()} sayısı
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div
            className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs font-medium"
            role="group"
            aria-label="Zaman aralığı"
          >
            {GRANULARITY_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onGranularityChange(option.value)}
                className={`rounded-md px-3 py-1.5 transition-colors ${
                  granularity === option.value
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <MetricToggle
            value={metric}
            onChange={onMetricChange}
            messagesLabel="Mesaj"
            leadsLabel="Konuşma"
          />
        </div>
      </div>

      <div className="relative z-50 mb-5 max-w-xl">
        <SearchableSelect
          label="Satışçı Seç"
          options={salespeopleOptions}
          value={selectedSalespeople}
          onChange={(next) =>
            handleSalespeopleChange(
              next,
              allIds,
              onSelectedSalespeopleChange,
            )
          }
          placeholder="Satışçı ara ve seç…"
        />
        <p className="mt-1 text-xs text-slate-500">
          En az bir satışçı seçilmelidir.
        </p>
      </div>

      <div className="h-96 w-full">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            Yükleniyor…
          </div>
        ) : data.length === 0 || seriesMeta.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            Bu filtreler için veri bulunamadı
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="label"
                tick={{ fill: "#64748b", fontSize: 12 }}
                interval="preserveStartEnd"
                minTickGap={24}
              />
              <YAxis
                tick={{ fill: "#64748b", fontSize: 12 }}
                allowDecimals={false}
                width={48}
              />
              <Tooltip
                formatter={(value, name) => {
                  const label =
                    seriesMeta.find((item) => item.id === name)?.name ??
                    String(name);
                  return [
                    new Intl.NumberFormat("tr-TR").format(Number(value ?? 0)),
                    label,
                  ];
                }}
                labelFormatter={(label) => String(label)}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #e2e8f0",
                  fontSize: 13,
                }}
              />
              <Legend
                formatter={(value) =>
                  seriesMeta.find((item) => item.id === value)?.name ?? value
                }
              />
              {seriesMeta.map((item) => (
                <Line
                  key={item.id}
                  type="monotone"
                  dataKey={item.id}
                  name={item.id}
                  stroke={colorById.get(item.id) ?? "#64748b"}
                  strokeWidth={2.5}
                  dot={{ r: 2.5, fill: colorById.get(item.id) ?? "#64748b" }}
                  activeDot={{ r: 4 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
