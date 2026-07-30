/**
 * API route: aggregated Chatwoot message and lead analytics.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAnalytics } from "@/lib/analytics";
import type { DashboardFilters, Granularity } from "@/lib/types";

function parseFilters(searchParams: URLSearchParams): DashboardFilters {
  const channelIds = searchParams
    .getAll("channelId")
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));

  return {
    startDate: searchParams.get("startDate"),
    endDate: searchParams.get("endDate"),
    universities: searchParams.getAll("university"),
    channelIds,
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
    const data = await getAnalytics(filters, granularity);
    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/analytics", error);
    return NextResponse.json(
      { error: "Analitik veriler yüklenemedi" },
      { status: 500 },
    );
  }
}
