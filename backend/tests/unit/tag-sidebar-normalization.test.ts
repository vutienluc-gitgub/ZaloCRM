/**
 * tag-sidebar-normalization.test.ts
 *
 * Unit tests verifying Tag Normalization, Deduplication, and Taxonomy Grouping
 * for CRM & Zalo Tags.
 */
import { describe, it, expect } from 'vitest';
import { normalizeTagName, deduplicateTags, groupTagsByTaxonomy } from '../../src/shared/tag-normalizer.js';

describe('Tag Normalization & Deduplication (Fix Verification)', () => {
  const sampleRawTags = [
    'ACCESSORIES',
    'áo mưa',
    'MARKETING',
    'Marketing',
    'Yarn',
    'yarn',
    '🔥 Đang chat',
    'Blogspot',
    'Buôn bán vải',
    'Wordpress',
    '🧊 Ít tương tác',
  ];

  it('normalizes tag names to proper Title Case', () => {
    expect(normalizeTagName('áo mưa')).toBe('Áo mưa');
    expect(normalizeTagName('ACCESSORIES')).toBe('Accessories');
    expect(normalizeTagName('CUT')).toBe('Cut');
    expect(normalizeTagName('DYEING')).toBe('Dyeing');
    expect(normalizeTagName('Buôn bán vải')).toBe('Buôn bán vải');
  });

  it('strips leading emojis and decorative symbols cleanly', () => {
    expect(normalizeTagName('🔥 Đang chat')).toBe('Đang chat');
    expect(normalizeTagName('🧊 Ít tương tác')).toBe('Ít tương tác');
    expect(normalizeTagName('✅ Đều đặn')).toBe('Đều đặn');
    expect(normalizeTagName('⭐ Khách VIP')).toBe('Khách VIP');
  });

  it('deduplicates case-insensitively and returns sorted Title Case tags', () => {
    const result = deduplicateTags(sampleRawTags);

    // Verify deduplication
    const marketingCount = result.filter((t) => t.toLowerCase() === 'marketing').length;
    const yarnCount = result.filter((t) => t.toLowerCase() === 'yarn').length;
    expect(marketingCount).toBe(1);
    expect(yarnCount).toBe(1);

    // Verify clean formatting
    expect(result).toContain('Accessories');
    expect(result).toContain('Áo mưa');
    expect(result).toContain('Đang chat');
    expect(result).not.toContain('ACCESSORIES');
    expect(result).not.toContain('🔥 Đang chat');
  });

  it('categorizes flat tags into structured taxonomy groups', () => {
    const grouped = groupTagsByTaxonomy(sampleRawTags);

    expect(grouped.product).toContain('Accessories');
    expect(grouped.product).toContain('Áo mưa');
    expect(grouped.product).toContain('Buôn bán vải');
    expect(grouped.product).toContain('Yarn');

    expect(grouped.marketing).toContain('Blogspot');
    expect(grouped.marketing).toContain('Marketing');
    expect(grouped.marketing).toContain('Wordpress');

    expect(grouped.engagement).toContain('Đang chat');
    expect(grouped.engagement).toContain('Ít tương tác');
  });
});
