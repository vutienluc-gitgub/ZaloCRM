/**
 * tag-normalizer.ts — Standardizes CRM & Zalo Tags for consistent display,
 * deduplication, and taxonomy categorization.
 */

// Regex stripping leading emojis and symbols (e.g. '🔥 ', '🧊 ', '✅ ', '⭐ ')
const LEADING_EMOJI_REGEX = /^[\p{Extended_Pictographic}\uFE0F\u200D\s·•\-_–—]+/u;

/**
 * Normalizes a tag string into standard Title Case with trimmed spacing and stripped emoji prefixes.
 * Examples:
 *   'áo mưa' -> 'Áo mưa'
 *   'ACCESSORIES' -> 'Accessories'
 *   'CUT' -> 'Cut'
 *   'DYEING' -> 'Dyeing'
 *   '🔥 Đang chat' -> 'Đang chat'
 */
export function normalizeTagName(raw: string): string {
  if (!raw) return '';

  // 1. Strip leading emoji & decorative symbols
  let clean = raw.replace(LEADING_EMOJI_REGEX, '').trim();

  // If stripping left empty string, fallback to trimmed raw
  if (!clean) {
    clean = raw.trim();
  }

  if (clean.length === 0) return '';

  // 2. Check casing: if all uppercase or all lowercase, apply Title Case
  const isAllUpper = clean === clean.toUpperCase() && clean !== clean.toLowerCase();
  const isAllLower = clean === clean.toLowerCase();

  if (isAllUpper || isAllLower) {
    // Capitalize first character, lowercase the rest (or capitalize each word if needed)
    // For single/multi-word tags: 'áo mưa' -> 'Áo mưa', 'ACCESSORIES' -> 'Accessories'
    const words = clean.split(/\s+/);
    clean = words
      .map((w, idx) => {
        if (!w) return '';
        // If first word, always capitalize first char
        if (idx === 0) {
          return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
        }
        // Sub-words: keep lowercase unless recognized acronym
        return w.toLowerCase();
      })
      .join(' ');
  } else {
    // Already mixed case: Ensure first character is uppercase
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

export interface TagTaxonomyGroups {
  product: string[];
  marketing: string[];
  engagement: string[];
  general: string[];
}

const PRODUCT_KEYWORDS = [
  'vải',
  'sợi',
  'dệt',
  'nhuộm',
  'may',
  'cắt',
  'phụ liệu',
  'áo',
  'quần',
  'mưa',
  'accessories',
  'cut',
  'dyeing',
  'yarn',
  'knitting',
  'fob',
  'in - thêu',
  'jean',
];

const MARKETING_KEYWORDS = [
  'marketing',
  'blogspot',
  'wordpress',
  'dev',
  'ads',
  'seo',
  'facebook',
  'tiktok',
  'kênh',
  'campaign',
];

const ENGAGEMENT_KEYWORDS = [
  'chat',
  'tương tác',
  'hẹn',
  'đều đặn',
  'giảm',
  'tích cực',
  'chưa rõ',
  'nóng',
  'lạnh',
  'ấm',
  'quan tâm',
];

/**
 * Categorizes a list of tags into structured taxonomy groups.
 */
export function groupTagsByTaxonomy(tags: string[]): TagTaxonomyGroups {
  const uniqueTags = deduplicateTags(tags);

  const groups: TagTaxonomyGroups = {
    product: [],
    marketing: [],
    engagement: [],
    general: [],
  };

  for (const tag of uniqueTags) {
    const lower = tag.toLowerCase();

    if (PRODUCT_KEYWORDS.some((kw) => lower.includes(kw))) {
      groups.product.push(tag);
    } else if (MARKETING_KEYWORDS.some((kw) => lower.includes(kw))) {
      groups.marketing.push(tag);
    } else if (ENGAGEMENT_KEYWORDS.some((kw) => lower.includes(kw))) {
      groups.engagement.push(tag);
    } else {
      groups.general.push(tag);
    }
  }

  return groups;
}
