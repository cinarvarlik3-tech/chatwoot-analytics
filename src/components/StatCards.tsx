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
  tertiaryLabel?: string;
  tertiarySubtitle?: string;
  tertiaryValue?: number;
  loading?: boolean;
  primaryIcon?: LucideIcon;
  secondaryIcon?: LucideIcon;
  tertiaryIcon?: LucideIcon;
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
  tertiaryLabel,
  tertiarySubtitle,
  tertiaryValue,
  loading,
  primaryIcon: PrimaryIcon = MessageSquare,
  secondaryIcon: SecondaryIcon = Users,
  tertiaryIcon: TertiaryIcon,
}: StatCardsProps) {
  const hasTertiary = tertiaryLabel !== undefined && tertiaryValue !== undefined;

  return (
    <div
      className={`grid gap-4 ${hasTertiary ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2"}`}
    >
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

      {hasTertiary && (
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">{tertiaryLabel}</p>
              {tertiarySubtitle && (
                <p className="text-xs text-slate-400">{tertiarySubtitle}</p>
              )}
              <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
                {loading ? "—" : formatNumber(tertiaryValue)}
              </p>
            </div>
            {TertiaryIcon && (
              <div className="rounded-xl bg-sky-50 p-3 text-sky-600">
                <TertiaryIcon className="h-5 w-5" aria-hidden />
              </div>
            )}
          </div>
        </article>
      )}
    </div>
  );
}
