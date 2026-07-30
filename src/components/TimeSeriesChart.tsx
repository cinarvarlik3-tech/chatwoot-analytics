"use client";

/**
 * Line chart for message or lead counts over time with metric toggle.
 */

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MetricToggle } from "@/components/MetricToggle";
import type { Granularity, MetricMode, TimeSeriesPoint } from "@/lib/types";

interface TimeSeriesChartProps {
  title: string;
  messagesData: TimeSeriesPoint[];
  leadsData: TimeSeriesPoint[];
  metric: MetricMode;
  onMetricChange: (metric: MetricMode) => void;
  granularity: Granularity;
  onGranularityChange: (granularity: Granularity) => void;
  loading?: boolean;
  messageMetricLabel?: string;
  leadMetricLabel?: string;
}

const GRANULARITY_OPTIONS: { value: Granularity; label: string }[] = [
  { value: "yearly", label: "Yıllık" },
  { value: "monthly", label: "Aylık" },
  { value: "weekly", label: "Haftalık" },
  { value: "daily", label: "Günlük" },
];

export function TimeSeriesChart({
  title,
  messagesData,
  leadsData,
  metric,
  onMetricChange,
  granularity,
  onGranularityChange,
  loading,
  messageMetricLabel = "Mesaj",
  leadMetricLabel = "Lead",
}: TimeSeriesChartProps) {
  const metricConfig: Record<
    MetricMode,
    { label: string; color: string; subtitle: string }
  > = {
    messages: {
      label: messageMetricLabel,
      color: "#7c3aed",
      subtitle: `Seçilen döneme göre ${messageMetricLabel.toLocaleLowerCase("tr")} sayısı`,
    },
    leads: {
      label: leadMetricLabel,
      color: "#059669",
      subtitle: `Seçilen döneme göre ${leadMetricLabel.toLocaleLowerCase("tr")} sayısı`,
    },
  };

  const config = metricConfig[metric];
  const data = metric === "messages" ? messagesData : leadsData;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <p className="text-sm text-slate-500">{config.subtitle}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
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
          <MetricToggle value={metric} onChange={onMetricChange} />
        </div>
      </div>

      <div className="h-80 w-full">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            Yükleniyor…
          </div>
        ) : data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            Bu filtreler için veri bulunamadı
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
                formatter={(value) => [
                  new Intl.NumberFormat("tr-TR").format(Number(value ?? 0)),
                  config.label,
                ]}
                labelFormatter={(label) => String(label)}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #e2e8f0",
                  fontSize: 13,
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={config.color}
                strokeWidth={2.5}
                dot={{ r: 3, fill: config.color }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
