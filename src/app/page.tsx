"use client";

/**
 * Application entry with year navigation and dashboard switching.
 */

import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Dashboard2025 } from "@/components/Dashboard";
import { Dashboard2026 } from "@/components/Dashboard2026";
import { UniversityAnalysis } from "@/components/UniversityAnalysis";
import type { DashboardView } from "@/lib/types";

export default function Home() {
  const [view, setView] = useState<DashboardView>("2026");

  return (
    <AppShell view={view} onViewChange={setView}>
      {view === "2025" && <Dashboard2025 />}
      {view === "2026" && <Dashboard2026 />}
      {view === "2026-university" && <UniversityAnalysis />}
    </AppShell>
  );
}
