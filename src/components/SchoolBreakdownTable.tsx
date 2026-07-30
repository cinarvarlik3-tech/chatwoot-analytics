"use client";

/**
 * Tabular breakdown of message and lead counts per school.
 */

import { useMemo, useState } from "react";
import { SearchableSelect } from "@/components/SearchableSelect";
import { SCHOOL_TABLE_SCROLL_HEIGHT } from "@/lib/layout";
import type { FilterOption, SchoolTableRow } from "@/lib/types";

interface SchoolBreakdownTableProps {
  data: SchoolTableRow[];
  loading?: boolean;
}

type SortDirection = "desc" | "asc";

function formatNumber(value: number): string {
  return new Intl.NumberFormat("tr-TR").format(value);
}

const cellClass = "px-5 py-[1.125rem]";

function toFilterOptions(rows: SchoolTableRow[]): FilterOption[] {
  return rows.map((row) => ({ id: row.key, name: row.name }));
}

export function SchoolBreakdownTable({
  data,
  loading,
}: SchoolBreakdownTableProps) {
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const baseRows = useMemo(
    () => data.filter((row) => row.messages > 0 || row.leads > 0),
    [data],
  );

  const selectOptions = useMemo(() => toFilterOptions(baseRows), [baseRows]);

  const rows = useMemo(() => {
    const filtered =
      selectedKeys.length === 0
        ? baseRows
        : baseRows.filter((row) => selectedKeys.includes(row.key));

    const direction = sortDirection === "desc" ? -1 : 1;
    return [...filtered].sort((a, b) => {
      const byMessages = (a.messages - b.messages) * direction;
      if (byMessages !== 0) return byMessages;
      const byLeads = (a.leads - b.leads) * direction;
      if (byLeads !== 0) return byLeads;
      return a.name.localeCompare(b.name, "tr");
    });
  }, [baseRows, selectedKeys, sortDirection]);

  return (
    <section className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="relative z-50 shrink-0 space-y-4 border-b border-slate-100 px-5 py-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Okul Özeti</h3>
          <p className="text-sm text-slate-500">
            En az bir mesaj veya lead kaydı olan okullar
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 flex-1">
            <SearchableSelect
              label="Okul Ara"
              options={selectOptions}
              value={selectedKeys}
              onChange={setSelectedKeys}
              placeholder="Okul ara ve seç…"
              disabled={loading || baseRows.length === 0}
            />
          </div>

          <div
            className="inline-flex shrink-0 self-start rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs font-medium sm:self-end"
            role="group"
            aria-label="Sıralama"
          >
            <button
              type="button"
              onClick={() => setSortDirection("desc")}
              className={`rounded-md px-3 py-2 transition-colors ${
                sortDirection === "desc"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Çoktan Aza
            </button>
            <button
              type="button"
              onClick={() => setSortDirection("asc")}
              className={`rounded-md px-3 py-2 transition-colors ${
                sortDirection === "asc"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Azdan Çoğa
            </button>
          </div>
        </div>
      </header>

      <div
        className={`min-h-0 overflow-x-auto overflow-y-auto ${SCHOOL_TABLE_SCROLL_HEIGHT}`}
      >
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_0_rgb(241_245_249)]">
            <tr className="text-left">
              <th
                scope="col"
                className={`${cellClass} font-semibold text-slate-700`}
              >
                Okul İsmi
              </th>
              <th
                scope="col"
                className={`${cellClass} text-right font-semibold text-slate-700`}
              >
                Lead Sayısı
              </th>
              <th
                scope="col"
                className={`${cellClass} text-right font-semibold text-slate-700`}
              >
                Mesaj Sayısı
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 12 }).map((_, index) => (
                <tr key={index} className="border-b border-slate-100">
                  <td className={cellClass}>
                    <div className="h-4 w-48 animate-pulse rounded bg-slate-100" />
                  </td>
                  <td className={cellClass}>
                    <div className="ml-auto h-4 w-16 animate-pulse rounded bg-slate-100" />
                  </td>
                  <td className={cellClass}>
                    <div className="ml-auto h-4 w-16 animate-pulse rounded bg-slate-100" />
                  </td>
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  className="px-5 py-[3.75rem] text-center text-slate-500"
                >
                  {selectedKeys.length > 0
                    ? "Seçilen okullar için veri bulunamadı"
                    : "Bu filtreler için okul verisi bulunamadı"}
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr
                  key={row.key}
                  className={`border-b border-slate-100 ${
                    index % 2 === 0 ? "bg-white" : "bg-slate-50/60"
                  }`}
                >
                  <td className={`${cellClass} font-medium text-slate-900`}>
                    {row.name}
                  </td>
                  <td className={`${cellClass} text-right tabular-nums text-slate-700`}>
                    {formatNumber(row.leads)}
                  </td>
                  <td className={`${cellClass} text-right tabular-nums font-semibold text-slate-900`}>
                    {formatNumber(row.messages)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
