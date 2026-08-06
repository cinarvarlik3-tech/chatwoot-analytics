"use client";

/**
 * Pie chart for school or channel breakdown with message/lead toggle.
 */

import { useState } from "react";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { MetricToggle } from "@/components/MetricToggle";
import { PIE_COLORS, preparePieData } from "@/lib/pieChartUtils";
import type { BreakdownPoint, MetricMode } from "@/lib/types";
import { UNPARSED_UNIVERSITY } from "@/lib/types";

interface BreakdownPieChartProps {
  title: string;
  messagesData: BreakdownPoint[];
  leadsData: BreakdownPoint[];
  metric: MetricMode;
  onMetricChange: (metric: MetricMode) => void;
  breakdownLabel: "school" | "channel";
  loading?: boolean;
  maxSlices?: number;
}

const SUBTITLES: Record<
  MetricMode,
  Record<BreakdownPieChartProps["breakdownLabel"], string>
> = {
  messages: {
    school: "Mesajların okul dağılımı",
    channel: "Mesajların kanal dağılımı",
  },
  leads: {
    school: "Leadlerin okul dağılımı",
    channel: "Leadlerin kanal dağılımı",
  },
};

/**
 * Optionally removes the unparsed school bucket from pie data.
 */
function filterUnparsedSchools(
  data: BreakdownPoint[],
  showUnparsed: boolean,
): BreakdownPoint[] {
  if (showUnparsed) return data;
  return data.filter((item) => item.key !== UNPARSED_UNIVERSITY);
}

export function BreakdownPieChart({
  title,
  messagesData,
  leadsData,
  metric,
  onMetricChange,
  breakdownLabel,
  loading,
  maxSlices = 10,
}: BreakdownPieChartProps) {
  const [showUnparsed, setShowUnparsed] = useState(true);
  const rawData = metric === "messages" ? messagesData : leadsData;
  const data =
    breakdownLabel === "school"
      ? filterUnparsedSchools(rawData, showUnparsed)
      : rawData;
  const chartData = preparePieData(data, maxSlices);
  const total = chartData.reduce((sum, item) => sum + item.value, 0);
  const subtitle = SUBTITLES[metric][breakdownLabel];
  const hasUnparsedBucket = rawData.some(
    (item) => item.key === UNPARSED_UNIVERSITY && item.value > 0,
  );

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <MetricToggle value={metric} onChange={onMetricChange} />
          {breakdownLabel === "school" && hasUnparsedBucket && (
            <button
              type="button"
              onClick={() => setShowUnparsed((prev) => !prev)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100"
            >
              {showUnparsed
                ? "Belirtilmeyenleri Gizle"
                : "Belirtilmeyenleri Göster"}
            </button>
          )}
        </div>
      </div>

      <div className="h-80 w-full">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            Yükleniyor…
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            Bu filtreler için veri bulunamadı
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={58}
                outerRadius={96}
                paddingAngle={2}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`${entry.key}-${index}`}
                    fill={PIE_COLORS[index % PIE_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, _name, item) => {
                  const num = Number(value ?? 0);
                  const pct = total ? ((num / total) * 100).toFixed(1) : "0";
                  return [
                    `${new Intl.NumberFormat("tr-TR").format(num)} (${pct}%)`,
                    item.payload.name,
                  ];
                }}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #e2e8f0",
                  fontSize: 13,
                }}
              />
              <Legend
                layout="horizontal"
                verticalAlign="bottom"
                wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
