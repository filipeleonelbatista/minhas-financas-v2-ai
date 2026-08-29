import { sanitizeDescription, sanitizeAmount } from '../../src/utils/sanitize';

describe('sanitize', () => {
  test('strip script tag keeps inner text', () => {
    expect(sanitizeDescription('<script>alert(1)</script>')).toBe('alert(1)');
  });

  test('strip svg/onload and event handlers', () => {
    expect(sanitizeDescription('<svg onload=alert(1)>')).not.toContain('<');
    expect(sanitizeDescription('<svg onload=alert(1)>')).not.toContain('onload');
    expect(sanitizeDescription('test onClick=evil()')).not.toContain('onClick');
  });

  test('blocks javascript: and data:', () => {
    expect(sanitizeDescription('javascript:alert(1)')).not.toMatch(/javascript:/i);
    expect(sanitizeDescription('data:text/html,evil')).not.toMatch(/data:/i);
    expect(sanitizeDescription('JaVaScRiPt:alert(1)')).not.toMatch(/javascript:/i);
  });

  test('strips <>{}$; chars', () => {
    expect(sanitizeDescription('hello<>{}$;world')).toBe('helloworld');
  });

  test('trim and NFKC and max 80 chars', () => {
    expect(sanitizeDescription('  hello  ')).toBe('hello');
    const long = 'a'.repeat(100);
    expect(sanitizeDescription(long).length).toBe(80);
    // NFKC: ﾊﾝｶｸ -> ハンカク (half-width katakana) or similar; test that normalize is applied
    // using compatibility char: 'ﬁ' (ligature) NFKC -> 'fi'
    expect(sanitizeDescription('ﬁ')).toBe('fi');
  });

  test('sanitizeAmount handles NaN, negative, max, 2 decimals', () => {
    expect(sanitizeAmount(NaN)).toBe(0);
    expect(sanitizeAmount('abc' as any)).toBe(0);
    expect(sanitizeAmount(-10)).toBe(0);
    expect(sanitizeAmount(999999999)).toBe(99999999.99);
    expect(sanitizeAmount(10.999)).toBe(11);
    expect(sanitizeAmount(10.111)).toBe(10.11);
    expect(sanitizeAmount('1' as any)).toBe(1);
  });

  test('SQL payload not break sanitize (strip)', () => {
    const out = sanitizeDescription("' OR 1=1 --");
    expect(out).not.toContain('<');
    expect(out).toContain('OR');
    // drizzle prepared statements handle SQLi, sanitize just strips dangerous html chars
  });
});
