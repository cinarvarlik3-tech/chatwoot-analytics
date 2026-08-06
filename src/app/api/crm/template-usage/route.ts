/**
 * API route: CRM (2026 live) message-template usage counts.
 */
import { NextRequest, NextResponse } from "next/server";
import { getCrmTemplateUsage } from "@/lib/crmTemplateUsage";
import type { CrmDashboardFilters } from "@/lib/types";

function parseFilters(searchParams: URLSearchParams): CrmDashboardFilters {
  return {
    startDate: searchParams.get("startDate"),
    endDate: searchParams.get("endDate"),
    parentUniversities: searchParams.getAll("parentUniversity"),
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filters = parseFilters(searchParams);
    const items = await getCrmTemplateUsage(filters);
    return NextResponse.json({ items });
  } catch (error) {
    console.error("GET /api/crm/template-usage", error);
    return NextResponse.json(
      { error: "Şablon kullanım verileri yüklenemedi" },
      { status: 500 },
    );
  }
}
