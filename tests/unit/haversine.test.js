/**
 * Unit tests for haversine distance and ETA utilities.
 * These must be pure functions with no external dependencies.
 */

const { haversineDistance, estimateETA } = require('../../backend/src/utils/haversine');

describe('haversineDistance', () => {
  test('should return 0 for identical coordinates', () => {
    expect(haversineDistance(13.0827, 80.2707, 13.0827, 80.2707)).toBeCloseTo(0, 4);
  });

  test('should calculate known distance correctly (Chennai to Bengaluru ≈ 290 km)', () => {
    const chennai = [13.0827, 80.2707];
    const bengaluru = [12.9716, 77.5946];
    const dist = haversineDistance(...chennai, ...bengaluru);
    expect(dist).toBeGreaterThan(270);
    expect(dist).toBeLessThan(310);
  });

  test('should return a positive number for any two different points', () => {
    expect(haversineDistance(0, 0, 1, 1)).toBeGreaterThan(0);
  });

  test('should be symmetric (A→B == B→A)', () => {
    const d1 = haversineDistance(13.0900, 80.2750, 13.0750, 80.2600);
    const d2 = haversineDistance(13.0750, 80.2600, 13.0900, 80.2750);
    expect(d1).toBeCloseTo(d2, 6);
  });

  test('should calculate small intra-city distances (<10 km) accurately', () => {
    // Two points ~2km apart in Chennai
    const dist = haversineDistance(13.0900, 80.2750, 13.0750, 80.2600);
    expect(dist).toBeGreaterThan(1);
    expect(dist).toBeLessThan(5);
  });
});

describe('estimateETA', () => {
  test('should return ceil of distance/speed*60', () => {
    // 30km at 30km/h = 60 minutes
    expect(estimateETA(30)).toBe(60);
  });

  test('should return 1 minute minimum for very short distances', () => {
    expect(estimateETA(0.1)).toBe(1); // 0.1km → 0.2 min → ceil to 1
  });

  test('should scale linearly with distance', () => {
    expect(estimateETA(15)).toBe(30);
    expect(estimateETA(45)).toBe(90);
  });
});
