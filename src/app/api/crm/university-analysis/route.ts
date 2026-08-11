/**
 * API route: CRM (2026 live) per-university analysis table.
 */

import { NextRequest, NextResponse } from "next/server";
import { getUniversityAnalysis, setManualScore } from "@/lib/crmUniversityAnalysis";

const INT4_MIN = -2147483648;
const INT4_MAX = 2147483647;

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

/** Sets (or, with score: null, clears) one university's Manuel Skor. */
export async function PUT(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek gövdesi" }, { status: 400 });
  }

  const { canonicalId, score } = (body ?? {}) as {
    canonicalId?: unknown;
    score?: unknown;
  };

  if (typeof canonicalId !== "string" || canonicalId.length === 0) {
    return NextResponse.json({ error: "canonicalId zorunludur" }, { status: 400 });
  }
  if (score !== null) {
    if (
      typeof score !== "number" ||
      !Number.isInteger(score) ||
      score < INT4_MIN ||
      score > INT4_MAX
    ) {
      return NextResponse.json(
        { error: `Manuel Skor ${INT4_MIN} ile ${INT4_MAX} arasında bir tam sayı olmalıdır` },
        { status: 400 },
      );
    }
  }

  try {
    await setManualScore(canonicalId, score);
    return NextResponse.json({ ok: true, canonicalId, score });
  } catch (error) {
    console.error("PUT /api/crm/university-analysis", error);
    return NextResponse.json({ error: "Manuel Skor kaydedilemedi" }, { status: 500 });
  }
}
