

// Centralized TLD lists and helpers
// Keep names consistent with existing imports

export const primaryTlds: string[] = [".com", ".ai", ".app", ".io", ".xyz", ".tech"];

export const allTlds: string[] = [
  ".pro",
  ".media",
  ".bet",
  ".vc",
  ".gg",
  ".so",
  ".dev",
  ".app",
  ".xyz",
  ".tech",
  ".store",
  ".shop",
  ".online",
  ".info",
  ".biz",
  ".mobi",
  ".me",
  ".tv",
  ".ws",
  ".cc",
  ".ca",
  ".us",
  ".ly",
  ".bio",
  ".cloud",
  ".eco",
  ".au",
  ".co",
  ".ch",
  ".it",
  ".fm",
  ".se",
  ".no",
  ".es",
  ".ai",
  ".io",
  ".org",
  ".net",
  ".com",
];

/** Normalize a TLD string: lowercase, ensure leading dot, trim spaces */
export function normalizeTld(input: string): string {
  if (!input) return "";
  let t = input.trim().toLowerCase();
  if (!t.startsWith(".")) t = "." + t;
  return t;
}

/** Check if a single TLD is in the known list */
export function isKnownTld(input: string): boolean {
  const t = normalizeTld(input);
  return allTlds.includes(t);
}

/**
 * Fast, client-side format check for a TLD. Does NOT require it to be in our list.
 * Rules (supports multi-label public suffixes like .com.au, .co.uk):
 *  - starts with a dot
 *  - each label: 2–24 chars, lowercase letters/numbers/hyphens only, cannot start or end with hyphen
 *  - 1–3 labels only (e.g., .com, .com.au, .co.uk)
 */
export function isLikelyValidTld(input: string): boolean {
  const t = normalizeTld(input);
  if (!t.startsWith(".")) return false;

  // Allow multi-label public suffixes like .com.au, .co.uk
  // Rules per label:
  //  - 2–24 characters
  //  - lowercase letters / digits / hyphen only
  //  - cannot start or end with hyphen
  const labels = t.slice(1).split(".");
  if (labels.length === 0 || labels.length > 3) return false; // keep it tight (1–3 labels)

  for (const label of labels) {
    if (label.length < 2 || label.length > 24) return false;
    if (!/^[a-z0-9-]+$/.test(label)) return false;
    if (label.startsWith("-") || label.endsWith("-")) return false;
  }
  return true;
}

/** Validate a list of TLDs; returns the valid and unknown subsets */
export function validateTlds(list: string[]): { valid: string[]; unknown: string[] } {
  const valid: string[] = [];
  const unknown: string[] = [];
  for (const raw of list) {
    const t = normalizeTld(raw);
    (allTlds.includes(t) ? valid : unknown).push(t);
  }
  return { valid, unknown };
}

/**
 * Autocorrect common TLD typos (best-effort).
 * Returns a corrected, normalized TLD string **or null** if no confident fix.
 * Examples: "com" -> ".com", ".gom" -> ".com", ".cpm" -> ".com".
 */
export function autocorrectTld(input: string): string | null {
  const t = normalizeTld(input);
  if (allTlds.includes(t)) return t; // already valid/known

  // Quick map for very common slips
  const quick: Record<string, string> = {
    ".cim": ".com",
    ".cpm": ".com",
    ".gom": ".com",
    ".om": ".com",
    ".cm": ".com",
  };
  if (quick[t]) return quick[t];

  // Heuristic: find the closest by Levenshtein distance.
  // Only accept if reasonably close.
  let best = "";
  let bestScore = Number.POSITIVE_INFINITY;
  for (const candidate of allTlds) {
    const d = levenshtein(t, candidate);
    if (d < bestScore) {
      bestScore = d;
      best = candidate;
    }
  }
  // Accept only small edits; distance 1 for very short strings, up to 2 for longer
  const maxAllowed = t.length <= 4 ? 1 : 2;
  return bestScore <= maxAllowed ? best : null;
}

/**
 * Suggest up to `max` close matches from the known list for "Did you mean …".
 * If the input is already a known TLD, returns an empty array.
 */
export function suggestClosestTlds(input: string, max = 5): string[] {
  const q = normalizeTld(input);
  if (!q) return primaryTlds.slice(0, max);
  if (allTlds.includes(q)) return [];

  // Prefer prefix matches, then substring matches, then distance ranking
  const starts = allTlds.filter((t) => t.startsWith(q));
  const contains = allTlds.filter((t) => !starts.includes(t) && t.includes(q));
  const ranked: string[] = [...starts, ...contains];

  if (ranked.length < max) {
    const scored = allTlds
      .filter((t) => !ranked.includes(t))
      .map((t) => ({ t, d: levenshtein(q, t) }))
      .sort((a, b) => a.d - b.d)
      .map((x) => x.t);
    ranked.push(...scored);
  }

  return Array.from(new Set(ranked)).slice(0, max);
}

/** Suggest up to `limit` TLDs based on a partial input */
export function suggestTlds(partial: string, limit = 5): string[] {
  const q = normalizeTld(partial);
  if (!q) return primaryTlds.slice(0, limit);

  const starts = allTlds.filter((t) => t.startsWith(q));
  const contains = allTlds.filter((t) => !starts.includes(t) && t.includes(q));

  const ranked = [...starts, ...contains];
  if (ranked.length >= limit) return ranked.slice(0, limit);

  // Fill with closest by distance if needed
  const scored = allTlds
    .filter((t) => !ranked.includes(t))
    .map((t) => ({ t, d: levenshtein(q, t) }))
    .sort((a, b) => a.d - b.d)
    .map((x) => x.t);

  return [...ranked, ...scored].slice(0, limit);
}

/* ───────────── internal: small Levenshtein helper ───────────── */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,       // deletion
        dp[i][j - 1] + 1,       // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }
  return dp[m][n];
}