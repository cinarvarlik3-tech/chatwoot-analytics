"use client";

/**
 * Top summary cards with configurable labels and values.
 */

import { LucideIcon, MessageSquare, Users } from "lucide-react";

interface StatCardsProps {
  primaryLabel: string;
  primaryValue: number;
  secondaryLabel: string;
  secondarySubtitle?: string;
  secondaryValue: number;
  loading?: boolean;
  primaryIcon?: LucideIcon;
  secondaryIcon?: LucideIcon;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("tr-TR").format(value);
}

export function StatCards({
  primaryLabel,
  primaryValue,
  secondaryLabel,
  secondarySubtitle,
  secondaryValue,
  loading,
  primaryIcon: PrimaryIcon = MessageSquare,
  secondaryIcon: SecondaryIcon = Users,
}: StatCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">{primaryLabel}</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
              {loading ? "—" : formatNumber(primaryValue)}
            </p>
          </div>
          <div className="rounded-xl bg-violet-50 p-3 text-violet-600">
            <PrimaryIcon className="h-5 w-5" aria-hidden />
          </div>
        </div>
      </article>

      <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">{secondaryLabel}</p>
            {secondarySubtitle && (
              <p className="text-xs text-slate-400">{secondarySubtitle}</p>
            )}
            <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
              {loading ? "—" : formatNumber(secondaryValue)}
            </p>
          </div>
          <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
            <SecondaryIcon className="h-5 w-5" aria-hidden />
          </div>
        </div>
      </article>
    </div>
  );
}
