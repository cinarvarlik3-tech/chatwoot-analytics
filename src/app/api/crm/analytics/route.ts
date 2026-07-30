/**
 * API route: CRM (2026 live) analytics.
 */

import { NextRequest, NextResponse } from "next/server";
import { getCrmAnalytics } from "@/lib/crmAnalytics";
import type { CrmDashboardFilters, Granularity } from "@/lib/types";

function parseFilters(searchParams: URLSearchParams): CrmDashboardFilters {
  return {
    startDate: searchParams.get("startDate"),
    endDate: searchParams.get("endDate"),
    parentUniversities: searchParams.getAll("parentUniversity"),
  };
}

function parseGranularity(value: string | null): Granularity {
  if (
    value === "daily" ||
    value === "weekly" ||
    value === "monthly" ||
    value === "yearly"
  ) {
    return value;
  }
  return "monthly";
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filters = parseFilters(searchParams);
    const granularity = parseGranularity(searchParams.get("granularity"));
    const data = await getCrmAnalytics(filters, granularity);
    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/crm/analytics", error);
    return NextResponse.json(
      { error: "CRM analitik veriler yüklenemedi" },
      { status: 500 },
    );
  }
}
