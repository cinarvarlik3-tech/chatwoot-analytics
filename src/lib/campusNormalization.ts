/**
 * The school dimension.
 *
 * Schools used to be derived in TypeScript from the free-text
 * `lead_details.university` value, collapsing "X Üniversitesi - Campus" to a parent
 * and mapping a hand-maintained abbreviation list. That is gone: the school a lead
 * is interested in is now parsed from incoming conversations and stored canonically
 * in `lead_university_mentions` -> `university_canonical`, so queries return parent
 * names directly and no client-side normalisation is needed.
 *
 * Keeping a second normaliser here was an active drift risk -- it had already
 * diverged from the parser's registry ("Orta Doğu Teknik Üniversitesi" here versus
 * "Ortadoğu Teknik Üniversitesi" there), which would have split one school into two
 * rows in the same table.
 */

/** Sentinel for leads with no parsed school, in filters and breakdown keys. */
export const UNPARSED_PARENT = "__UNPARSED__";

/** Label shown for the unparsed bucket. */
export const UNPARSED_LABEL = "Belirtilmemiş";

/** Maps a breakdown/filter key to its display label. */
export function getParentLabel(parentKey: string): string {
  return parentKey === UNPARSED_PARENT ? UNPARSED_LABEL : parentKey;
}

/** Maps a school name returned by SQL to its breakdown/filter key. */
export function toParentKey(canonicalName: string): string {
  return canonicalName === UNPARSED_LABEL ? UNPARSED_PARENT : canonicalName;
}

/**
 * Appends the school filter to a WHERE clause under construction.
 *
 * Shared by the analytics and sales-analytics queries so both read the school
 * dimension the same way. Requires `leads l` to be in scope. Uses EXISTS against the
 * parsed mentions, so a lead that named several schools matches any of them, and the
 * unparsed bucket is the absence of any mention.
 */
export function appendSchoolFilter(
  parts: string[],
  params: unknown[],
  parentFilters: string[],
): void {
  if (parentFilters.length === 0) return;

  const includesUnparsed = parentFilters.includes(UNPARSED_PARENT);
  const named = parentFilters.filter((value) => value !== UNPARSED_PARENT);
  const clauses: string[] = [];

  if (named.length > 0) {
    params.push(named);
    clauses.push(
      `EXISTS (SELECT 1 FROM lead_university_mentions m
                 JOIN university_canonical uc ON uc.id = m.canonical_id
                WHERE m.lead_uuid = l.uuid
                  AND uc.canonical_name = ANY($${params.length}::text[]))`,
    );
  }

  if (includesUnparsed) {
    clauses.push(
      `NOT EXISTS (SELECT 1 FROM lead_university_mentions m WHERE m.lead_uuid = l.uuid)`,
    );
  }

  if (clauses.length > 0) parts.push(`(${clauses.join(" OR ")})`);
}
