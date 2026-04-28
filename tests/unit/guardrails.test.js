/**
 * Unit tests for guardrail functions:
 * - profanity detection
 * - distance validation
 * - skill matching
 */

const {
  containsProfanity,
  validateBookingDistance,
  validateSkillMatch,
  MAX_BOOKING_DISTANCE_KM,
} = require('../../backend/src/middleware/guardrails');

describe('Profanity Filter', () => {
  test('should detect profanity in lowercase', () => {
    expect(containsProfanity('my pipe is shit')).toBe(true);
  });

  test('should detect profanity in mixed case', () => {
    expect(containsProfanity('This is SHIT')).toBe(true);
  });

  test('should return false for clean text', () => {
    expect(containsProfanity('my pipe is leaking please fix it')).toBe(false);
  });

  test('should return false for empty string', () => {
    expect(containsProfanity('')).toBe(false);
  });

  test('should return false for null/undefined', () => {
    expect(containsProfanity(null)).toBe(false);
    expect(containsProfanity(undefined)).toBe(false);
  });

  test('should handle normal service description without false positives', () => {
    expect(containsProfanity('AC is not cooling well, please check the refrigerant')).toBe(false);
  });
});

describe('Distance Guardrail', () => {
  test('should accept distance within 50km', () => {
    const result = validateBookingDistance(25);
    expect(result.valid).toBe(true);
  });

  test('should accept distance exactly at limit', () => {
    const result = validateBookingDistance(MAX_BOOKING_DISTANCE_KM);
    expect(result.valid).toBe(true);
  });

  test('should reject distance exceeding 50km', () => {
    const result = validateBookingDistance(51);
    expect(result.valid).toBe(false);
    expect(result.message).toContain('50km');
  });

  test('should reject very large distances', () => {
    const result = validateBookingDistance(500);
    expect(result.valid).toBe(false);
  });
});

describe('Skill Match Guardrail', () => {
  test('should pass when technician has the requested skill', () => {
    const result = validateSkillMatch(['plumber', 'mason'], 'plumber');
    expect(result.valid).toBe(true);
  });

  test('should fail when technician lacks the requested skill', () => {
    const result = validateSkillMatch(['electrician'], 'plumber');
    expect(result.valid).toBe(false);
    expect(result.message).toContain('plumber');
  });

  test('should fail for empty skill list', () => {
    const result = validateSkillMatch([], 'ac_repair');
    expect(result.valid).toBe(false);
  });

  test('should pass for exact match in multi-skill list', () => {
    const result = validateSkillMatch(['plumber', 'electrician', 'ac_repair'], 'ac_repair');
    expect(result.valid).toBe(true);
  });
});
