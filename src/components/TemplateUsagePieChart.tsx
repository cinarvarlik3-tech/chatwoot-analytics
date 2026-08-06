"use client";

/**
 * Pie chart showing how many times each property message template was sent.
 */

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { PIE_COLORS, preparePieData } from "@/lib/pieChartUtils";
import type { BreakdownPoint } from "@/lib/types";

interface TemplateUsagePieChartProps {
  data: BreakdownPoint[];
  loading?: boolean;
  maxSlices?: number;
}

export function TemplateUsagePieChart({
  data,
  loading,
  maxSlices = 12,
}: TemplateUsagePieChartProps) {
  const chartData = preparePieData(data, maxSlices);
  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5">
        <h3 className="text-base font-semibold text-slate-900">
          Şablon Kullanımı
        </h3>
        <p className="text-sm text-slate-500">
          Gönderilen hazır mesaj şablonlarının dağılımı
        </p>
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
