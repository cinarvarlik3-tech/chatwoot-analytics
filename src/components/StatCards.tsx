"use client";

/**
 * Top summary cards for total message and lead counts.
 */

import { MessageSquare, Users } from "lucide-react";

interface StatCardsProps {
  messages: number;
  leads: number;
  loading?: boolean;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("tr-TR").format(value);
}

export function StatCards({ messages, leads, loading }: StatCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Toplam Mesaj</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
              {loading ? "—" : formatNumber(messages)}
            </p>
          </div>
          <div className="rounded-xl bg-violet-50 p-3 text-violet-600">
            <MessageSquare className="h-5 w-5" aria-hidden />
          </div>
        </div>
      </article>

      <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Toplam Lead</p>
            <p className="mt-1 text-xs text-slate-400">Benzersiz konuşma</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
              {loading ? "—" : formatNumber(leads)}
            </p>
          </div>
          <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
            <Users className="h-5 w-5" aria-hidden />
          </div>
        </div>
      </article>
    </div>
  );
}
