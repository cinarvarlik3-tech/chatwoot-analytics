/**
 * API route: CRM (2026 live) per-university analysis table.
 */

import { NextResponse } from "next/server";
import { getUniversityAnalysis } from "@/lib/crmUniversityAnalysis";

export async function GET() {
  try {
    const data = await getUniversityAnalysis();
    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/crm/university-analysis", error);
    return NextResponse.json(
      { error: "Üniversite analiz verileri yüklenemedi" },
      { status: 500 },
    );
  }
}
