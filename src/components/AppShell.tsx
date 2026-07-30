"use client";

/**
 * Collapsible side navigation for 2025 archive vs 2026 live CRM views.
 */

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { DashboardYear } from "@/lib/types";

interface AppShellProps {
  year: DashboardYear;
  onYearChange: (year: DashboardYear) => void;
  children: React.ReactNode;
}

const NAV_ITEMS: { year: DashboardYear; label: string; hint: string }[] = [
  { year: "2025", label: "2025 Yılı", hint: "Chatwoot arşivi" },
  { year: "2026", label: "2026 Yılı", hint: "Canlı CRM" },
];

export function AppShell({ year, onYearChange, children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex min-h-screen">
        <aside
          className={`sticky top-0 flex h-screen shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-white transition-[width] duration-200 ease-in-out ${
            collapsed ? "w-16" : "w-56"
          }`}
        >
          <div
            className={`flex shrink-0 items-center border-b border-slate-100 py-4 ${
              collapsed ? "justify-center px-2" : "justify-between px-3"
            }`}
          >
            {!collapsed && (
              <span className="min-w-0 truncate px-1 text-sm font-semibold text-slate-900">
                Univotel
              </span>
            )}
            <button
              type="button"
              onClick={() => setCollapsed((prev) => !prev)}
              className="shrink-0 rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              aria-label={
                collapsed ? "Kenar çubuğunu genişlet" : "Kenar çubuğunu daralt"
              }
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </button>
          </div>

          <nav className="flex min-w-0 flex-1 flex-col gap-1 overflow-hidden p-2">
            {NAV_ITEMS.map((item) => {
              const active = year === item.year;
              return (
                <button
                  key={item.year}
                  type="button"
                  onClick={() => onYearChange(item.year)}
                  title={collapsed ? item.label : undefined}
                  className={`min-w-0 overflow-hidden rounded-xl transition-colors ${
                    collapsed ? "px-1 py-2.5" : "px-3 py-3 text-left"
                  } ${
                    active
                      ? "bg-violet-600 text-white shadow-sm"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {collapsed ? (
                    <span className="block truncate text-center text-xs font-semibold">
                      {item.year}
                    </span>
                  ) : (
                    <>
                      <span className="block truncate text-sm font-semibold">
                        {item.label}
                      </span>
                      <span
                        className={`mt-0.5 block truncate text-xs ${
                          active ? "text-violet-100" : "text-slate-500"
                        }`}
                      >
                        {item.hint}
                      </span>
                    </>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
