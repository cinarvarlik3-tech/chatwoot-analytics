/**
 * API route: filter options for schools, channels, and date bounds.
 */

import { NextResponse } from "next/server";
import { getFilterOptions } from "@/lib/analytics";

export async function GET() {
  try {
    const data = await getFilterOptions();
    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/filters", error);
    return NextResponse.json(
      { error: "Filtre seçenekleri yüklenemedi" },
      { status: 500 },
    );
  }
}
