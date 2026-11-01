/**
 * tag-normalizer.ts — Standardizes CRM & Zalo Tags for consistent display,
 * deduplication, and taxonomy categorization in frontend.
 */

const LEADING_EMOJI_REGEX = /^[\p{Extended_Pictographic}\uFE0F\u200D\s·•\-_–—]+/u;

/**
 * Normalizes a tag string into standard Title Case with trimmed spacing and stripped emoji prefixes.
 */
export function normalizeTagName(raw: string): string {
  if (!raw) return '';

  let clean = raw.replace(LEADING_EMOJI_REGEX, '').trim();

  if (!clean) {
    clean = raw.trim();
  }

  if (clean.length === 0) return '';

  const isAllUpper = clean === clean.toUpperCase() && clean !== clean.toLowerCase();
  const isAllLower = clean === clean.toLowerCase();

  if (isAllUpper || isAllLower) {
    const words = clean.split(/\s+/);
    clean = words
      .map((w, idx) => {
        if (!w) return '';
        if (idx === 0) {
          return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
        }
        return w.toLowerCase();
      })
      .join(' ');
  } else {
    clean = clean.charAt(0).toUpperCase() + clean.slice(1);
  }

  return clean;
}

/**
 * Deduplicates a list of tag names case-insensitively, returning clean Title Case tags sorted in Vietnamese.
 */
export function deduplicateTags(tags: string[]): string[] {
  const map = new Map<string, string>();

  for (const t of tags) {
    const normalized = normalizeTagName(t);
    if (!normalized || normalized.length < 2) continue;

    const lowerKey = normalized.toLowerCase();
    if (!map.has(lowerKey)) {
      map.set(lowerKey, normalized);
    }
  }

  return Array.from(map.values()).sort((a, b) => a.localeCompare(b, 'vi'));
}
