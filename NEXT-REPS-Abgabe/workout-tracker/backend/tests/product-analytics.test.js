const {
  ALLOWED_EVENTS,
  sanitizeMetadata,
} = require('../modules/product-analytics/product-analytics.routes');

describe('product analytics privacy boundaries', () => {
  test('accepts only the documented product events', () => {
    expect(ALLOWED_EVENTS.has('workout_completed')).toBe(true);
    expect(ALLOWED_EVENTS.has('password_entered')).toBe(false);
  });

  test('keeps only non-sensitive allowlisted metadata', () => {
    expect(sanitizeMetadata({
      exerciseCount: 4,
      setCount: '12',
      hasPlan: true,
      exerciseName: 'Bench Press',
      notes: 'private note',
    })).toEqual({
      exerciseCount: 4,
      setCount: 12,
      hasPlan: true,
    });
  });

  test('rejects malformed metadata containers', () => {
    expect(sanitizeMetadata(['private'])).toBeNull();
    expect(sanitizeMetadata(null)).toBeNull();
  });
});
