"use client";

/**
 * Toggle between message count and lead count metrics.
 */

import type { MetricMode } from "@/lib/types";

interface MetricToggleProps {
  value: MetricMode;
  onChange: (value: MetricMode) => void;
}

export function MetricToggle({ value, onChange }: MetricToggleProps) {
  return (
    <div
      className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs font-medium"
      role="group"
      aria-label="Metrik seçimi"
    >
      <button
        type="button"
        onClick={() => onChange("messages")}
        className={`rounded-md px-3 py-1.5 transition-colors ${
          value === "messages"
            ? "bg-white text-slate-900 shadow-sm"
            : "text-slate-600 hover:text-slate-900"
        }`}
      >
        Mesaj
      </button>
      <button
        type="button"
        onClick={() => onChange("leads")}
        className={`rounded-md px-3 py-1.5 transition-colors ${
          value === "leads"
            ? "bg-white text-slate-900 shadow-sm"
            : "text-slate-600 hover:text-slate-900"
        }`}
      >
        Lead
      </button>
    </div>
  );
}
