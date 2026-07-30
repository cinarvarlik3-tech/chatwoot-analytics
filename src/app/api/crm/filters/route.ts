/**
 * API route: CRM (2026 live) filter options.
 */

import { NextResponse } from "next/server";
import { getCrmFilterOptions } from "@/lib/crmAnalytics";

export async function GET() {
  try {
    const data = await getCrmFilterOptions();
    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/crm/filters", error);
    return NextResponse.json(
      { error: "CRM filtre seçenekleri yüklenemedi" },
      { status: 500 },
    );
  }
}
