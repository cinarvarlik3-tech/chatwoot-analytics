"use client";

/**
 * Application entry with year navigation and dashboard switching.
 */

import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Dashboard2025 } from "@/components/Dashboard";
import { Dashboard2026 } from "@/components/Dashboard2026";
import type { DashboardYear } from "@/lib/types";

export default function Home() {
  const [year, setYear] = useState<DashboardYear>("2026");

  return (
    <AppShell year={year} onYearChange={setYear}>
      {year === "2025" ? <Dashboard2025 /> : <Dashboard2026 />}
    </AppShell>
  );
}
