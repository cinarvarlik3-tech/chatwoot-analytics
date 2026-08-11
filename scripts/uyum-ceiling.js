#!/usr/bin/env node
/**
 * Recomputes PORTFOLIO_CEILING for src/lib/uyumScore.ts.
 *
 * Raw Uyum is bounded by the portfolio rather than by 10: even a perfectly placed
 * campus cannot exceed what 13 properties in a handful of districts can offer. This
 * sweeps a hypothetical campus across İstanbul and reports the best score anywhere,
 * which is what the displayed 9.0 is anchored to.
 *
 * Run after adding, moving, repricing or closing a property, then paste the result
 * into PORTFOLIO_CEILING. Needs no API key -- it works off committed data, using the
 * corpus's own median minutes-per-km to estimate travel from straight-line distance.
 *
 *   node scripts/uyum-ceiling.js
 */

const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const distances = JSON.parse(fs.readFileSync(path.join(root, "src/data/distances.json"), "utf8"));

// properties.ts is TypeScript; pull the fields we need without a compiler
const src = fs.readFileSync(path.join(root, "src/data/properties.ts"), "utf8");
const KAVACIK_BILLS_TL = Number(src.match(/KAVACIK_BILLS_TL\s*=\s*(\d+)/)[1]);
const properties = [];
for (const block of src.split(/\n  \{\n/).slice(1)) {
  const get = (re) => (block.match(re) || [])[1];
  const id = get(/id:\s*"([^"]+)"/);
  if (!id) continue;
  const rooms = [...block.matchAll(/occupancy:\s*(\d+),\s*priceMin:\s*(\d+)/g)]
    .map((m) => ({ occupancy: +m[1], priceMin: +m[2] }));
  properties.push({
    id,
    gender: get(/gender:\s*"([^"]+)"/),
    lat: Number(get(/lat:\s*([-\d.]+)/)),
    lng: Number(get(/lng:\s*([-\d.]+)/)),
    quality: Number(get(/quality:\s*([\d.]+)/)),
    billsExtra: /billsExtra:\s*true/.test(block),
    rooms,
  });
}

const TIERS = [
  { max: 21_999, weight: 0.4 },
  { max: 30_000, weight: 0.35 },
  { max: Infinity, weight: 0.25 },
];
const OCC = { 1: 0.5, 2: 0.25, 3: 0, 4: -0.25, 5: -0.5 };
const qualityFactor = (q) => 0.35 + (0.65 * (Math.max(1, Math.min(5, q)) - 1)) / 4;
const access = (t) => {
  if (t > 90) return 0;
  if (t <= 10) return 1;
  if (t <= 25) return 1 - (0.35 * (t - 10)) / 15;
  return 0.65 * Math.exp(-(t - 25) / 25);
};

const haversine = (a, b, c, d) => {
  const r = (x) => (x * Math.PI) / 180;
  const dLat = r(c - a);
  const dLng = r(d - b);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
};

// calibrate straight-line -> minutes from the real routed legs we already have
const ratios = Object.values(distances)
  .filter((d) => d.km && d.transit)
  .map((d) => d.transit / d.km)
  .sort((a, b) => a - b);
const MIN_PER_KM = ratios[Math.floor(ratios.length / 2)];

function scoreAt(lat, lng, gender) {
  const best = TIERS.map(() => 0);
  for (const p of properties) {
    if (!(p.gender === "mixed" || p.gender === gender)) continue;
    const minutes = Math.max(3, (haversine(lat, lng, p.lat, p.lng) / 1000) * MIN_PER_KM);
    const reach = access(minutes);
    if (reach <= 0) continue;
    const cheapest = Math.min(...p.rooms.map((r) => r.priceMin));
    for (const room of p.rooms) {
      const q = p.quality + (room.priceMin === cheapest ? 0 : (OCC[room.occupancy] ?? 0));
      const price = room.priceMin + (p.billsExtra ? KAVACIK_BILLS_TL : 0);
      const tier = TIERS.findIndex((t) => price <= t.max);
      if (tier < 0) continue;
      const s = reach * qualityFactor(q);
      if (s > best[tier]) best[tier] = s;
    }
  }
  return TIERS.reduce((sum, t, i) => sum + t.weight * best[i], 0);
}

let ceiling = 0;
let at = null;
for (let lat = 40.9; lat <= 41.2; lat += 0.004) {
  for (let lng = 28.6; lng <= 29.3; lng += 0.004) {
    const u = (scoreAt(lat, lng, "female") + scoreAt(lat, lng, "male")) / 2;
    if (u > ceiling) {
      ceiling = u;
      at = [lat, lng];
    }
  }
}

const near = properties
  .map((p) => ({ id: p.id, m: Math.round(haversine(at[0], at[1], p.lat, p.lng)) }))
  .sort((a, b) => a.m - b.m)
  .slice(0, 3);

console.log(`properties: ${properties.length}   median min/km: ${MIN_PER_KM.toFixed(2)}`);
console.log(`best-servable point: ${at[0].toFixed(3)}, ${at[1].toFixed(3)}`);
console.log(`  nearest: ${near.map((n) => `${n.id} (${n.m}m)`).join(", ")}`);
console.log(`\nPORTFOLIO_CEILING = ${ceiling.toFixed(3)}`);
console.log(`UYUM_SCALE        = ${(0.9 / ceiling).toFixed(4)}   (ceiling reads 9.0)`);
