/**
 * Detects which property message template(s) a CRM message body is an
 * instance of. Used for the "template usage" breakdown.
 *
 * A message counts as an instance of template T when:
 *   1. IDENTITY - it names T's property (`aliases`, incl. known renames) and
 *      does not match a `guard` for a different product reusing the same body.
 *   2. SHEET    - it reproduces the template body, either
 *        a) coverage >= COVERAGE_MIN of T's word-trigrams after URL/markdown
 *           stripping (so link and phrasing variants still match), or
 *        b) it links one of T's own univotel.com paths and is substantial
 *           (older body revisions that changed wording but kept the page link).
 *
 * This intentionally counts both bot-automated sends and agents pasting the
 * sheet manually — "usage count" here means "how often was this template
 * sent", not "how often did the bot send it".
 */
import { MESSAGE_TEMPLATES } from "./messageTemplates";

const COVERAGE_MIN = 0.35;
const SUBSTANTIAL_LENGTH = 200;

function fold(text: string): string {
  return text
    .replace(/İ/g, "i")
    .replace(/I/g, "i")
    .replace(/ı/g, "i")
    .replace(/Ş/g, "s")
    .replace(/ş/g, "s")
    .replace(/Ğ/g, "g")
    .replace(/ğ/g, "g")
    .replace(/Ü/g, "u")
    .replace(/ü/g, "u")
    .replace(/Ö/g, "o")
    .replace(/ö/g, "o")
    .replace(/Ç/g, "c")
    .replace(/ç/g, "c")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "");
}

/** Turkish-folds, strips URLs/markdown/punctuation, collapses whitespace. */
function normalize(text: string): string {
  return fold(text)
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/\*+/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function shingles(tokens: string[], n = 3): Set<string> {
  const set = new Set<string>();
  for (let i = 0; i + n <= tokens.length; i++) {
    set.add(tokens.slice(i, i + n).join(" "));
  }
  return set;
}

interface TemplateModel {
  shortCode: string;
  shingles: Set<string>;
  /** Folded (not normalized) univotel.com path segments unique to this template. */
  slugs: string[];
  aliases: string[];
  guards: string[];
}

const MODELS: TemplateModel[] = MESSAGE_TEMPLATES.map((template) => {
  const slugs = [...template.content.matchAll(/univotel\.com\/([^\s?"]+)/g)].map(
    (match) => fold(match[1]).replace(/\/+$/, ""),
  );
  return {
    shortCode: template.shortCode,
    shingles: shingles(normalize(template.content).split(" ")),
    slugs,
    aliases: template.aliases,
    guards: template.guards ?? [],
  };
});

/** Returns every template short-code this message body is an instance of (usually 0 or 1). */
export function matchTemplates(content: string | null | undefined): string[] {
  if (!content) return [];
  const raw = fold(content);
  const norm = normalize(content);
  if (!norm) return [];

  const messageShingles = shingles(norm.split(" "));
  const hits: string[] = [];

  for (const model of MODELS) {
    if (!model.aliases.some((alias) => norm.includes(alias))) continue;
    if (model.guards.some((guard) => norm.includes(guard))) continue;

    let intersection = 0;
    for (const shingle of model.shingles) {
      if (messageShingles.has(shingle)) intersection++;
    }
    const coverage = model.shingles.size ? intersection / model.shingles.size : 0;
    const matchesBySlug =
      norm.length >= SUBSTANTIAL_LENGTH && model.slugs.some((slug) => raw.includes(slug));

    if (coverage >= COVERAGE_MIN || matchesBySlug) hits.push(model.shortCode);
  }

  return hits;
}
