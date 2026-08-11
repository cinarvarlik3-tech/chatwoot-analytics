/**
 * Uyum Skoru: how well the property portfolio can actually house a school's
 * students. Supply-side counterpart to İlgi Skoru, which is pure demand.
 *
 * Deliberately excludes margin. Uyum answers "can we house this student well?",
 * which is the student's view — they do not care what we earn. Margin enters only
 * in Önem, via the yield factor below.
 *
 * Everything is computed from committed data (properties.ts, campuses.ts,
 * distances.json), so no external API is called at runtime.
 */

import { CAMPUSES } from "@/data/campuses";
import { KAVACIK_BILLS_TL, PROPERTIES, type Property } from "@/data/properties";
import rawDistances from "@/data/distances.json";

interface Leg {
  walking: number | null;
  transit: number | null;
  km?: number;
}
const DISTANCES = rawDistances as Record<string, Leg>;

/** Weight of İlgi in Önem; Uyum takes the remainder. 0.5 = geometric mean. */
export const ILGI_WEIGHT = 0.5;

/** Vocational schools never rank, per the operator. */
const MYO_RE = /MYO|Meslek Y[üu]ksek/i;

/**
 * Price bands, TL per person per month. Uyum rewards *coverage across bands*
 * rather than cheapness: students have different budgets, so a school reachable
 * at every price point is better served than one reachable only at premium.
 * Economy is weighted heaviest because most students are price-sensitive.
 */
const TIERS = [
  { key: "ekonomik", max: 21_999, weight: 0.4 },
  { key: "orta", max: 30_000, weight: 0.35 },
  { key: "premium", max: Infinity, weight: 0.25 },
] as const;

/**
 * Travel-time decay over whichever of walking/transit is faster. İstanbul makes
 * straight-line distance actively misleading — the Bosphorus and the hills mean
 * 5 km can be 45 minutes — so this runs on real routed durations.
 */
function access(walking: number | null, transit: number | null): number {
  const best = Math.min(walking ?? Infinity, transit ?? Infinity);
  if (!Number.isFinite(best) || best > 90) return 0;
  if (best <= 10) return 1;
  if (best <= 25) return 1 - (0.35 * (best - 10)) / 15;
  return 0.65 * Math.exp(-(best - 25) / 25);
}

/** Maps 1-5 quality onto a 0.35-1.0 multiplier. */
const qualityFactor = (q: number) => 0.35 + (0.65 * (Math.max(1, Math.min(5, q)) - 1)) / 4;

/**
 * Privacy shifts with how many people share the room -- except on a property's
 * cheapest room, which is cheap *because* it is shared. Charging occupancy there
 * too would penalise the same fact twice and is what pinned the economy tier
 * (and with it the whole scale) near 0.35.
 */
const OCCUPANCY_ADJUSTMENT: Record<number, number> = { 1: 0.5, 2: 0.25, 3: 0, 4: -0.25, 5: -0.5 };

/**
 * Raw Uyum is bounded by the portfolio, not by 10. Sweeping a hypothetical campus
 * across İstanbul on a 0.004 grid, the best-servable point anywhere in the city
 * scores 0.666 -- near Kağıthane/Şişli, by Univotel Şişli, Academia Residence and
 * A.H. Beşiktaş. Nişantaşı, the best real school, reaches ~95% of that.
 *
 * So the displayed score is rescaled so that ceiling reads 9.0, leaving 9-10 for
 * coverage better than the current portfolio can deliver to anyone. Ordering and
 * relative spread are untouched -- it is a single multiplication.
 *
 * RECOMPUTE whenever properties change: scripts/uyum-ceiling.js
 */
export const PORTFOLIO_CEILING = 0.666;
export const UYUM_SCALE = 0.9 / PORTFOLIO_CEILING; // 1.3523

const serves = (p: Property, gender: "female" | "male") =>
  p.gender === "mixed" || p.gender === gender;

interface TierBest {
  strength: number;
  margin: number;
}

/** Best option per price band for one campus and one student gender. */
function bestPerTier(campusName: string, gender: "female" | "male"): TierBest[] {
  const best: TierBest[] = TIERS.map(() => ({ strength: 0, margin: 1 }));

  for (const property of PROPERTIES) {
    if (!serves(property, gender)) continue;
    const leg = DISTANCES[`${property.id}|${campusName}`];
    if (!leg) continue;
    const reach = access(leg.walking, leg.transit);
    if (reach <= 0) continue;

    const cheapest = Math.min(...property.rooms.map((r) => r.priceMin));
    for (const room of property.rooms) {
      const quality =
        property.quality +
        (room.priceMin === cheapest ? 0 : (OCCUPANCY_ADJUSTMENT[room.occupancy] ?? 0));
      const price = room.priceMin + (property.billsExtra ? KAVACIK_BILLS_TL : 0);
      const tierIndex = TIERS.findIndex((t) => price <= t.max);
      if (tierIndex < 0) continue;

      const strength = reach * qualityFactor(quality);
      if (strength > best[tierIndex].strength) {
        best[tierIndex] = { strength, margin: property.marginIndex };
      }
    }
  }
  return best;
}

export interface UyumResult {
  /** 0-10, blended 50/50 across genders. */
  uyum: number;
  uyumFemale: number;
  uyumMale: number;
  /**
   * Strength-weighted average marginIndex of the options forming this school's
   * Uyum — i.e. what we earn from the properties its students would actually use.
   */
  getiri: number;
}

function scoreCampus(campusName: string, gender: "female" | "male") {
  const best = bestPerTier(campusName, gender);
  let uyum = 0;
  let weighted = 0;
  let total = 0;
  TIERS.forEach((tier, i) => {
    uyum += tier.weight * best[i].strength;
    weighted += tier.weight * best[i].strength * best[i].margin;
    total += tier.weight * best[i].strength;
  });
  return { uyum, getiri: total > 0 ? weighted / total : 1 };
}

/**
 * Uyum per canonical university, rolled up from campuses by best campus.
 *
 * Best-campus rather than average: a student at İTÜ Maçka can use a property near
 * Maçka even if nothing is near Ayazağa. Averaging would understate real coverage,
 * though best-campus does flatter schools whose campuses are far apart.
 */
export function computeUyum(): Map<string, UyumResult> {
  const byUniversity = new Map<string, { f: number; m: number; gf: number; gm: number }[]>();

  for (const campus of CAMPUSES) {
    const f = scoreCampus(campus.campusName, "female");
    const m = scoreCampus(campus.campusName, "male");
    const list = byUniversity.get(campus.canonicalName) ?? [];
    list.push({ f: f.uyum, m: m.uyum, gf: f.getiri, gm: m.getiri });
    byUniversity.set(campus.canonicalName, list);
  }

  const out = new Map<string, UyumResult>();
  for (const [name, entries] of byUniversity) {
    const bestF = entries.reduce((a, b) => (b.f > a.f ? b : a));
    const bestM = entries.reduce((a, b) => (b.m > a.m ? b : a));
    const f = Math.min(10, bestF.f * UYUM_SCALE * 10);
    const m = Math.min(10, bestM.m * UYUM_SCALE * 10);
    out.set(name, {
      uyumFemale: f,
      uyumMale: m,
      uyum: (f + m) / 2,
      getiri: (bestF.gf + bestM.gm) / 2,
    });
  }
  return out;
}

/** True when a school should never appear in the rankings. */
export const isExcludedSchool = (name: string) => MYO_RE.test(name);

/**
 * Önem Skoru, 0-10. Geometric mean of İlgi and Uyum, tilted by yield.
 *
 * Multiplicative on purpose: a school we cannot house is not important however
 * loud the demand, and a school nobody asks about is not important however well
 * we could house it. A weighted sum would let one mask the other.
 *
 * The yield exponent is held at 0.5 to damp double-counting — Galata and Şişli
 * are central, so high margin already correlates with good coverage.
 */
export function computeOnem(ilgi: number, uyum: number, getiri: number, getiriAvg: number): number {
  if (ilgi <= 0 || uyum <= 0) return 0;
  const base = Math.pow(ilgi, ILGI_WEIGHT) * Math.pow(uyum, 1 - ILGI_WEIGHT);
  const yieldFactor = getiriAvg > 0 ? Math.pow(getiri / getiriAvg, 0.5) : 1;
  return base * yieldFactor;
}
