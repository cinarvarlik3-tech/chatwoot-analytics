"use client";

/**
 * Collapsible side navigation for 2025 archive vs 2026 live CRM views.
 */

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { DashboardView } from "@/lib/types";
import { viewYear } from "@/lib/types";

interface AppShellProps {
  view: DashboardView;
  onViewChange: (view: DashboardView) => void;
  children: React.ReactNode;
}

interface NavItem {
  view: DashboardView;
  label: string;
  hint: string;
  short: string;
  children?: { view: DashboardView; label: string }[];
}

const NAV_ITEMS: NavItem[] = [
  { view: "2025", label: "2025 Yılı", hint: "Chatwoot arşivi", short: "2025" },
  {
    view: "2026",
    label: "2026 Yılı",
    hint: "Canlı CRM",
    short: "2026",
    children: [{ view: "2026-university", label: "Üniversite Analizi" }],
  },
];

export function AppShell({ view, onViewChange, children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const activeYear = viewYear(view);

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

          <nav className="flex min-w-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden p-2">
            {NAV_ITEMS.map((item) => {
              // The parent highlights only on its own view, so an active child does
              // not make two rows look selected at once.
              const parentActive = view === item.view;
              const branchActive = viewYear(item.view) === activeYear;

              return (
                <div key={item.view} className="min-w-0">
                  <button
                    type="button"
                    onClick={() => onViewChange(item.view)}
                    title={collapsed ? item.label : undefined}
                    aria-current={parentActive ? "page" : undefined}
                    className={`w-full min-w-0 overflow-hidden rounded-xl transition-colors ${
                      collapsed ? "px-1 py-2.5" : "px-3 py-3 text-left"
                    } ${
                      parentActive
                        ? "bg-violet-600 text-white shadow-sm"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {collapsed ? (
                      <span className="block truncate text-center text-xs font-semibold">
                        {item.short}
                      </span>
                    ) : (
                      <>
                        <span className="block truncate text-sm font-semibold">
                          {item.label}
                        </span>
                        <span
                          className={`mt-0.5 block truncate text-xs ${
                            parentActive ? "text-violet-100" : "text-slate-500"
                          }`}
                        >
                          {item.hint}
                        </span>
                      </>
                    )}
                  </button>

                  {/* Sub-items stay visible while anywhere in that year's branch, so
                      the user can see where they are and get back out. */}
                  {!collapsed && item.children && branchActive && (
                    <div className="mt-1 flex flex-col gap-1 border-l border-slate-200 pl-2 ml-3">
                      {item.children.map((child) => {
                        const childActive = view === child.view;
                        return (
                          <button
                            key={child.view}
                            type="button"
                            onClick={() => onViewChange(child.view)}
                            aria-current={childActive ? "page" : undefined}
                            className={`min-w-0 overflow-hidden rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors ${
                              childActive
                                ? "bg-violet-50 text-violet-700"
                                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                            }`}
                          >
                            <span className="block truncate">{child.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
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
