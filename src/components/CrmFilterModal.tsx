"use client";

/**
 * Global filter modal for the 2026 CRM dashboard (date + parent university).
 */

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { SearchableSelect } from "@/components/SearchableSelect";
import type { CrmDashboardFilters, CrmFilterOptionsResponse } from "@/lib/types";

interface CrmFilterModalProps {
  open: boolean;
  onClose: () => void;
  options: CrmFilterOptionsResponse | null;
  filters: CrmDashboardFilters;
  onApply: (filters: CrmDashboardFilters) => void;
}

const emptyFilters: CrmDashboardFilters = {
  startDate: null,
  endDate: null,
  parentUniversities: [],
};

export function CrmFilterModal({
  open,
  onClose,
  options,
  filters,
  onApply,
}: CrmFilterModalProps) {
  const [draft, setDraft] = useState<CrmDashboardFilters>(filters);

  useEffect(() => {
    if (open) setDraft(filters);
  }, [open, filters]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end bg-slate-900/40 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="mt-12 w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="crm-filter-title"
      >
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 id="crm-filter-title" className="text-lg font-semibold text-slate-900">
            Filtreler
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            aria-label="Kapat"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="space-y-5 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-slate-700">
                Başlangıç
              </span>
              <input
                type="date"
                value={draft.startDate ?? ""}
                min={options?.dateRange.min}
                max={options?.dateRange.max}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    startDate: e.target.value || null,
                  }))
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-violet-500 focus:ring-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-slate-700">Bitiş</span>
              <input
                type="date"
                value={draft.endDate ?? ""}
                min={options?.dateRange.min}
                max={options?.dateRange.max}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    endDate: e.target.value || null,
                  }))
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-violet-500 focus:ring-2"
              />
            </label>
          </div>

          <SearchableSelect
            label="Üniversite"
            options={options?.parentUniversities ?? []}
            value={draft.parentUniversities}
            onChange={(parentUniversities) =>
              setDraft((prev) => ({ ...prev, parentUniversities }))
            }
            placeholder="Üniversite ara…"
          />
        </div>

        <footer className="flex gap-3 border-t border-slate-100 px-5 py-4">
          <button
            type="button"
            onClick={() => {
              setDraft(emptyFilters);
              onApply(emptyFilters);
              onClose();
            }}
            className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Temizle
          </button>
          <button
            type="button"
            onClick={() => {
              onApply(draft);
              onClose();
            }}
            className="flex-1 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-700"
          >
            Uygula
          </button>
        </footer>
      </div>
    </div>
  );
}
