const {
  countByUtcDay,
  parseWindowDays,
  percentage,
  startOfUtcDay,
} = require('../scripts/productAnalyticsReport');

describe('privacy-safe analytics summary helpers', () => {
  test('uses a safe default and accepts bounded report windows', () => {
    expect(parseWindowDays([])).toBe(30);
    expect(parseWindowDays(['--days=7'])).toBe(7);
    expect(() => parseWindowDays(['--days=0'])).toThrow(/between 1 and 365/);
    expect(() => parseWindowDays(['--days=30.5'])).toThrow(/between 1 and 365/);
  });

  test('builds UTC window boundaries', () => {
    expect(startOfUtcDay(6, new Date('2026-08-07T18:30:00Z')).toISOString())
      .toBe('2026-08-01T00:00:00.000Z');
  });

  test('aggregates dates without retaining account identifiers', () => {
    expect(countByUtcDay([
      { createdAt: new Date('2026-08-06T10:00:00Z') },
      { createdAt: new Date('2026-08-06T18:00:00Z') },
      { createdAt: new Date('2026-08-07T08:00:00Z') },
    ])).toEqual({
      '2026-08-06': 2,
      '2026-08-07': 1,
    });
  });

  test('formats percentages and handles empty populations', () => {
    expect(percentage(1, 3)).toBe(33.3);
    expect(percentage(0, 0)).toBe(0);
  });
});
