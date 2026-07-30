/**
 * Maps campus-level university strings (DB) to parent university labels (UI).
 */

const ABBREVIATION_TO_PARENT: Record<string, string> = {
  itu: "İstanbul Teknik Üniversitesi",
  itü: "İstanbul Teknik Üniversitesi",
  ytu: "Yıldız Teknik Üniversitesi",
  ytü: "Yıldız Teknik Üniversitesi",
  boun: "Boğaziçi Üniversitesi",
  bogazici: "Boğaziçi Üniversitesi",
  boğaziçi: "Boğaziçi Üniversitesi",
  odtu: "Orta Doğu Teknik Üniversitesi",
  odtü: "Orta Doğu Teknik Üniversitesi",
  metu: "Orta Doğu Teknik Üniversitesi",
  iau: "İstanbul Aydın Üniversitesi",
  iaü: "İstanbul Aydın Üniversitesi",
  iu: "İstanbul Üniversitesi",
  iü: "İstanbul Üniversitesi",
  medipol: "İstanbul Medipol Üniversitesi",
};

/** Normalizes text for parent lookup keys. */
function normalizeKey(value: string): string {
  return value
    .toLocaleLowerCase("tr")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Returns the parent university label for a campus-level DB value.
 */
export function getParentUniversity(campus: string | null | undefined): string {
  const trimmed = (campus || "").trim();
  if (!trimmed || trimmed.toLocaleLowerCase("tr") === "bilinmiyor") {
    return "Belirtilmemiş";
  }

  const head = trimmed.split(" - ")[0]?.trim() || trimmed;
  const headKey = normalizeKey(head);

  if (ABBREVIATION_TO_PARENT[headKey]) {
    return ABBREVIATION_TO_PARENT[headKey];
  }

  if (/üniversitesi|university/i.test(head)) {
    return head;
  }

  return head;
}

/** Sentinel for unparsed schools in filters. */
export const UNPARSED_PARENT = "__UNPARSED__";

/** Maps parent filter value to display label. */
export function getParentLabel(parentKey: string): string {
  if (parentKey === UNPARSED_PARENT) return "Belirtilmemiş";
  return parentKey;
}

/** Returns true when a campus belongs to a parent filter selection. */
export function campusMatchesParent(
  campus: string | null | undefined,
  parentFilters: string[],
): boolean {
  if (parentFilters.length === 0) return true;

  const parent = getParentUniversity(campus);
  const parentKey =
    parent === "Belirtilmemiş" ? UNPARSED_PARENT : parent;

  return parentFilters.includes(parentKey);
}

/** Aggregates campus-level metrics by parent university for charts/tables. */
export function aggregateByParent<T extends { campus: string; value: number }>(
  rows: T[],
): { key: string; name: string; value: number }[] {
  const totals = new Map<string, number>();

  for (const row of rows) {
    const parent = getParentUniversity(row.campus);
    const key = parent === "Belirtilmemiş" ? UNPARSED_PARENT : parent;
    totals.set(key, (totals.get(key) || 0) + row.value);
  }

  return [...totals.entries()]
    .map(([key, value]) => ({
      key,
      name: getParentLabel(key),
      value,
    }))
    .sort((a, b) => b.value - a.value);
}
