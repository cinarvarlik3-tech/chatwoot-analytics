/**
 * API route: CRM salesperson performance analytics (2026).
 */

import { NextRequest, NextResponse } from "next/server";
import { getCrmSalesAnalytics } from "@/lib/crmSalesAnalytics";
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
    const salespersonIds = searchParams.getAll("salespersonId");
    const data = await getCrmSalesAnalytics(
      filters,
      granularity,
      salespersonIds,
    );
    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/crm/sales-analytics", error);
    return NextResponse.json(
      { error: "Satışçı analitik veriler yüklenemedi" },
      { status: 500 },
    );
  }
}
