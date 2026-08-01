"use client";

/**
 * Performance summary table for CRM salespeople (outbound messages/conversations).
 */

import { useMemo, useState } from "react";
import { MetricToggle } from "@/components/MetricToggle";
import type { MetricMode, SalespersonPerformanceRow } from "@/lib/types";

interface SalespersonPerformanceTableProps {
  data: SalespersonPerformanceRow[];
  loading?: boolean;
  metric: MetricMode;
  onMetricChange: (metric: MetricMode) => void;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("tr-TR").format(value);
}

const cellClass = "px-5 py-[1.125rem]";

export function SalespersonPerformanceTable({
  data,
  loading,
  metric,
  onMetricChange,
}: SalespersonPerformanceTableProps) {
  const [sortDirection, setSortDirection] = useState<"desc" | "asc">("desc");

  const rows = useMemo(() => {
    const direction = sortDirection === "desc" ? -1 : 1;
    return [...data].sort((a, b) => {
      const pick = (row: SalespersonPerformanceRow) =>
        metric === "messages" ? row.totalMessages : row.totalConversations;

      const byTotal = (pick(a) - pick(b)) * direction;
      if (byTotal !== 0) return byTotal;
      return a.name.localeCompare(b.name, "tr");
    });
  }, [data, metric, sortDirection]);

  const valueSuffix = metric === "messages" ? "Mesaj" : "Konuşma";

  return (
    <section className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="shrink-0 space-y-4 border-b border-slate-100 px-5 py-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Agent Performansı
            </h3>
            <p className="text-sm text-slate-500">
              Giden mesaj ve konuşma sayıları (satışçılar + Bot)
            </p>
          </div>
          <MetricToggle
            value={metric}
            onChange={onMetricChange}
            messagesLabel="Mesaj"
            leadsLabel="Konuşma"
          />
        </div>
      </header>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className={`${cellClass} font-medium`}>Satışçı</th>
              <th className={`${cellClass} font-medium`}>
                Toplam {valueSuffix}
              </th>
              <th className={`${cellClass} font-medium`}>
                Son 30 Gün {valueSuffix}
              </th>
              <th className={`${cellClass} font-medium`}>
                Bugün {valueSuffix}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={4} className={`${cellClass} text-slate-500`}>
                  Yükleniyor…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={4} className={`${cellClass} text-slate-500`}>
                  Satışçı verisi bulunamadı
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const total =
                  metric === "messages"
                    ? row.totalMessages
                    : row.totalConversations;
                const last30 =
                  metric === "messages"
                    ? row.last30DaysMessages
                    : row.last30DaysConversations;
                const today =
                  metric === "messages"
                    ? row.todayMessages
                    : row.todayConversations;

                return (
                  <tr key={row.id} className="hover:bg-slate-50/60">
                    <td className={`${cellClass} font-medium text-slate-900`}>
                      {row.name}
                    </td>
                    <td className={`${cellClass} tabular-nums text-slate-700`}>
                      {formatNumber(total)}
                    </td>
                    <td className={`${cellClass} tabular-nums text-slate-700`}>
                      {formatNumber(last30)}
                    </td>
                    <td className={`${cellClass} tabular-nums text-slate-700`}>
                      {formatNumber(today)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {!loading && rows.length > 0 && (
        <footer className="border-t border-slate-100 px-5 py-3">
          <button
            type="button"
            onClick={() =>
              setSortDirection((prev) => (prev === "desc" ? "asc" : "desc"))
            }
            className="text-xs font-medium text-slate-500 hover:text-slate-800"
          >
            Toplam {valueSuffix.toLowerCase()}a göre sırala:{" "}
            {sortDirection === "desc" ? "Azalan" : "Artan"}
          </button>
        </footer>
      )}
    </section>
  );
}
